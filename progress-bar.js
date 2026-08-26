export const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 300));

const stepCount = 7;
let step = 0;

export function updateProgressBar(context) {
    if (context==="done") {
        const elements = document.querySelectorAll('.loading-screen');
        elements.forEach(element => {
            element.style.display = 'none';
        })
    } else {
        step++;
        const loadingContext = document.getElementById('loading-context');
        const loadingProgress = document.getElementById('loading-progress');
        loadingContext.textContent = context;
        loadingProgress.style.width = `${step/stepCount*100}%`;
    }
}
