
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Load and convert CSV data
async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime)
    }));

    return data;
}


// Group lines into individual commits
function processCommits(data) {
    return d3.groups(data, (d) => d.commit)
        .map(([commit, lines]) => {

            const first = lines[0];

            const {
                author,
                date,
                time,
                timezone,
                datetime
            } = first;

            const ret = {
                id: commit,

                url: 'https://github.com/1eo-lz/portfolio/commit/' + commit,

                author,
                date,
                time,
                timezone,
                datetime,

                hourFrac: datetime.getHours() +
                    datetime.getMinutes() / 60,

                totalLines: lines.length
            };

            Object.defineProperty(ret, 'lines', {
                value: lines,
                writable: false,
                configurable: false,
                enumerable: false
            });

            return ret;
        });
}


// Display summary statistics
function renderCommitInfo(data, commits) {

    const stats = d3.select('#stats');
    stats.html('');

    const dl = stats.append('dl')
        .attr('class', 'stats');

    const fileLengths = d3.rollups(
        data,
        (v) => d3.max(v, (d) => d.line),
        (d) => d.file
    );

    const numberFiles = d3.group(
        data,
        (d) => d.file
    ).size;

    const longestFile = d3.greatest(
        fileLengths,
        (d) => d[1]
    );

    const averageFileLength = d3.mean(
        fileLengths,
        (d) => d[1]
    );

    const averageLineLength = d3.mean(
        data,
        (d) => d.length
    );

    // Total lines
    dl.append('dt').text('Total LOC');
    dl.append('dd').text(data.length);

    // Total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    // Number of files
    dl.append('dt').text('Number of files');
    dl.append('dd').text(numberFiles);

    // Longest file
    dl.append('dt').text('Longest file');
    dl.append('dd').text(
        longestFile
            ? `${longestFile[0]} (${longestFile[1]} lines)`
            : 'N/A'
    );

    // Average file length
    dl.append('dt').text('Average file length');
    dl.append('dd').text(
        averageFileLength.toFixed(1) + ' lines'
    );

    // Average line length
    dl.append('dt').text('Average line length');
    dl.append('dd').text(
        averageLineLength.toFixed(1) + ' characters'
    );
}


// Tooltip content
function renderTooltipContent(commit) {

    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');

    if (!commit) return;

    link.href = commit.url;
    link.textContent = commit.id;

    date.textContent = commit.datetime.toLocaleDateString(
        'en',
        { dateStyle: 'full' }
    );

    time.textContent = commit.datetime.toLocaleTimeString(
        'en',
        { hour: '2-digit', minute: '2-digit' }
    );

    author.textContent = commit.author;
    lines.textContent = commit.totalLines;
}


// Show or hide tooltip
function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}


// Position tooltip beside mouse
function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');

    tooltip.style.left = `${event.clientX + 15}px`;
    tooltip.style.top = `${event.clientY + 15}px`;
}


// Check whether a commit is inside the brush
function isCommitSelected(selection, commit) {

    if (!selection) {
        return false;
    }

    const [[x0, y0], [x1, y1]] = selection;

    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);

    return x >= x0 && x <= x1 &&
           y >= y0 && y <= y1;
}


// Display number of selected commits
function renderSelectionCount(selection) {

    const selectedCommits = selection
        ? commits.filter((d) =>
            isCommitSelected(selection, d)
        )
        : [];

    const countElement = document.querySelector(
        '#selection-count'
    );

    countElement.textContent =
        `${selectedCommits.length || 'No'} commits selected`;

    return selectedCommits;
}


// Display languages in selected commits
function renderLanguageBreakdown(selection) {

    const selectedCommits = selection
        ? commits.filter((d) =>
            isCommitSelected(selection, d)
        )
        : [];

    const container = document.getElementById(
        'language-breakdown'
    );

    container.innerHTML = '';

    if (selectedCommits.length === 0) {
        return;
    }

    const lines = selectedCommits.flatMap(
        (d) => d.lines
    );

    const breakdown = d3.rollup(
        lines,
        (v) => v.length,
        (d) => d.type || 'Unknown'
    );

    for (const [language, count] of breakdown) {

        const proportion = count / lines.length;

        const formatted = d3.format('.1~%')(
            proportion
        );

        container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
    }
}


// Variables used by the brush
let xScale;
let yScale;
let commits;


// Scatterplot
function renderScatterPlot() {

    const width = 1000;
    const height = 600;

    const margin = {
        top: 10,
        right: 10,
        bottom: 40,
        left: 60
    };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom
    };

    const svg = d3.select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    // X scale: dates
    xScale = d3.scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    // Y scale: time of day
    yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    // Grid lines
    const gridlines = svg.append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(
        d3.axisLeft(yScale)
            .tickFormat('')
            .tickSize(-usableArea.width)
    );

    // X axis
    const xAxis = d3.axisBottom(xScale);

    svg.append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    // Y axis
    const yAxis = d3.axisLeft(yScale)
        .tickFormat((d) =>
            String(d % 24).padStart(2, '0') + ':00'
        );

    svg.append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    // Axis labels
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height - 3)
        .attr('text-anchor', 'middle')
        .text('Date');

    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .text('Time of day');

    // Brush
    const brush = d3.brush()
        .extent([
            [usableArea.left, usableArea.top],
            [usableArea.right, usableArea.bottom]
        ])
        .on('start brush end', brushed);

    svg.call(brush);

    // Draw dots after the brush overlay
    const dots = svg.append('g')
        .attr('class', 'dots');

    const [minLines, maxLines] = d3.extent(
        commits,
        (d) => d.totalLines
    );

    const rScale = d3.scaleSqrt()
        .domain([minLines, maxLines || minLines + 1])
        .range([2, 15]);

    // Larger dots first, smaller dots on top
    const sortedCommits = d3.sort(
        commits,
        (d) => -d.totalLines
    );

    dots.selectAll('circle')
        .data(sortedCommits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7)

        .on('mouseenter', (event, commit) => {

            d3.select(event.currentTarget)
                .style('fill-opacity', 1);

            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })

        .on('mousemove', (event) => {
            updateTooltipPosition(event);
        })

        .on('mouseleave', (event) => {

            d3.select(event.currentTarget)
                .style('fill-opacity', 0.7);

            updateTooltipVisibility(false);
        });
    
    dots.raise();


    // Brush event handler
    function brushed(event) {

        const selection = event.selection;

        d3.selectAll('.dots circle')
            .classed('selected', (d) =>
                isCommitSelected(selection, d)
            );

        renderSelectionCount(selection);
        renderLanguageBreakdown(selection);
    }
}


// Load everything
async function main() {

    const data = await loadData();

    commits = processCommits(data);

    renderCommitInfo(data, commits);

    if (commits.length > 0) {
        renderScatterPlot();
    } else {
        document.getElementById('chart').textContent =
            'No commits found.';
    }
}

main().catch((error) => {
    console.error('Unable to load codebase data:', error);
});
