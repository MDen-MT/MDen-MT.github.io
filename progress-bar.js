export const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 300));

const stepCount = 8;
let step = 0;

export function updateProgressBar(context) {
    if (context === "done") {
        const loadingScreen = document.querySelectorAll('.loading-screen')[0];
        const wrapper = document.querySelectorAll('.wrapper')[0];
        loadingScreen.style.display = 'none';
        wrapper.style.display = 'flex';
    } else {
        step++;
        const loadingContext = document.getElementById('loading-context');
        const loadingProgress = document.getElementById('loading-progress');
        loadingContext.textContent = context;
        loadingProgress.style.width = `${step / stepCount * 100}%`;
    }
}
