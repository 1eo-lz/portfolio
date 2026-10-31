
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

import { fetchJSON, renderProjects } from '../global.js';


const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.searchBar');
const projectsTitle = document.querySelector('.projects-title');

let query = '';
let selectedYear = null;


function getSearchFilteredProjects() {
    return projects.filter((project) => {
        const values = Object.values(project).join('\n').toLowerCase();

        return values.includes(query.toLowerCase());
    });
}


// Draw the pie chart and legend
function renderPieChart(projectsGiven) {

    // Group projects by year
    const rolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year
    );

    // Convert data into labels and values
    const data = rolledData
        .map(([year, count]) => ({
            value: count,
            label: String(year)
        }))
        .sort((a, b) => Number(a.label) - Number(b.label));

    const svg = d3.select('#projects-pie-plot');
    const legend = d3.select('.legend');

    svg.selectAll('*').remove();
    legend.selectAll('*').remove();

    // Show message if there are no matching projects
    if (data.length === 0) {
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('y', 5)
            .text('No matching projects');
        return;
    }

    const colors = d3.scaleOrdinal(d3.schemeTableau10);

    // pie slices
    const sliceGenerator = d3.pie()
        .value((d) => d.value)
        .sort(null);

    const arcData = sliceGenerator(data);

    const arcGenerator = d3.arc()
        .innerRadius(0)
        .outerRadius(50);

    // pie chart slices
    svg.selectAll('path')
        .data(arcData)
        .join('path')
        .attr('d', arcGenerator)
        .attr('fill', (_, i) => colors(i))
        .attr('role', 'button')
        .attr('tabindex', 0)
        .attr('aria-label', (d) =>
            `${d.data.label}: ${d.data.value} projects`
        )
        .classed('selected', (d) =>
            d.data.label === selectedYear
        )
        .on('click', (event, d) => {
            toggleYear(d.data.label);
        })
        .on('keydown', (event, d) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleYear(d.data.label);
            }
        });

    // legend
    legend.selectAll('li')
        .data(data)
        .join('li')
        .attr('class', (d) =>
            d.label === selectedYear ? 'selected' : ''
        )
        .attr('style', (_, i) => `--color:${colors(i)}`)
        .attr('role', 'button')
        .attr('tabindex', 0)
        .attr('aria-pressed', (d) =>
            String(d.label === selectedYear)
        )
        .html((d) =>
            `<span class="swatch"></span>
             ${d.label} <em>(${d.value})</em>`
        )
        .on('click', (event, d) => {
            toggleYear(d.label);
        })
        .on('keydown', (event, d) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleYear(d.label);
            }
        });
}


// year toggle
function toggleYear(year) {
    selectedYear = selectedYear === year ? null : year;
    renderPage();
}


// Update 
function renderPage() {

    
    const searchFilteredProjects = getSearchFilteredProjects();

    const visibleProjects = selectedYear === null
        ? searchFilteredProjects
        : searchFilteredProjects.filter(
            (project) => String(project.year) === selectedYear
        );

    renderProjects(
        visibleProjects,
        projectsContainer,
        'h2'
    );

    projectsTitle.textContent =
        `Projects (${visibleProjects.length})`;

    renderPieChart(searchFilteredProjects);
}


searchInput.addEventListener('input', (event) => {
    query = event.target.value;
    renderPage();
});


// render
renderPage();
