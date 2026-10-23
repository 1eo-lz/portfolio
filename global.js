
console.log('IT’S ALIVE!');

function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'contact/', title: 'Contact' },
    { url: 'cv/', title: 'CV' }
];

// base
const BASE_PATH = (location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1')
    ? '/'
    : '/portfolio/';

// navigation
let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    let a = document.createElement('a');

    a.href = BASE_PATH + url;
    a.textContent = p.title;

    if (a.host === location.host &&
        a.pathname === location.pathname) {
        a.classList.add('current');
    }

    nav.append(a);
}

// dark mode
document.body.insertAdjacentHTML(
    'afterbegin',
    `<label class="color-scheme">
        Theme:
        <select>
            <option value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>`
);

// change & save
let select = document.querySelector('.color-scheme select');

function setColorScheme(colorScheme) {
    document.documentElement.style.setProperty(
        'color-scheme',
        colorScheme
    );
    select.value = colorScheme;
}

if ('colorScheme' in localStorage) {
    setColorScheme(localStorage.colorScheme);
}

select.addEventListener('input', function (event) {
    setColorScheme(event.target.value);
    localStorage.colorScheme = event.target.value;
});

// open links new tab
for (let a of $$('a')) {
    if (a.host !== location.host) {
        a.target = '_blank';
    }
}


export async function fetchJSON(url) {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching or parsing JSON data:', error);
        throw error;
    }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
    if (!containerElement) {
        console.error('Projects container not found.');
        return;
    }

    containerElement.innerHTML = '';

    for (const project of projects) {
        const article = document.createElement('article');
        const heading = document.createElement(headingLevel);
        const image = document.createElement('img');
        const description = document.createElement('p');

        heading.textContent = project.title;
        image.src = project.image;
        image.alt = project.title;
        description.textContent = project.description;

        article.append(heading, image, description);
        containerElement.appendChild(article);
    }
}

export async function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`);
}
