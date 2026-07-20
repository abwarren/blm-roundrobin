/**
 * DOM Helper Utilities
 */

export function qs(selector, context = document) {
    return context.querySelector(selector);
}

export function qsa(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

export function createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [key, val] of Object.entries(attrs)) {
        if (key === 'className') el.className = val;
        else if (key === 'innerHTML') el.innerHTML = val;
        else if (key.startsWith('on')) el[key] = val;
        else el.setAttribute(key, val);
    }
    for (const child of children) {
        if (typeof child === 'string') el.appendChild(document.createTextNode(child));
        else el.appendChild(child);
    }
    return el;
}

export function debounce(fn, ms = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

export function formatCurrency(amount) {
    return `R${(amount || 0).toFixed(2)}`;
}

export function formatPercent(value) {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value || 0).toFixed(1)}%`;
}
