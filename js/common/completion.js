export class CompletionEffect {
    constructor() {
        this.audio = new Audio('../assets/audio/applause.mp3');
        this.speechSynthesis = window.speechSynthesis;
        this.japaneseVoice = null;
        this.initVoice();
    }

    async initVoice() {
        if (this.speechSynthesis.getVoices().length === 0) {
            await new Promise(resolve => {
                this.speechSynthesis.addEventListener('voiceschanged', resolve, { once: true });
            });
        }
        this.japaneseVoice = this.speechSynthesis.getVoices().find(voice => voice.lang === 'ja-JP');
    }

    createConfetti() {
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];
        const confettiCount = 150;
        const container = document.createElement('div');
        container.className = 'confetti-container';
        document.body.appendChild(container);

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.animationDelay = `${Math.random() * 3}s`;
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            
            const size = Math.random() * 10 + 5;
            confetti.style.width = `${size}px`;
            confetti.style.height = `${size * 2}px`;
            
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            
            container.appendChild(confetti);
        }

        setTimeout(() => container.remove(), 5000);
    }

    playSounds() {
        this.audio.load();
        
        this.audio.play().catch(error => {
            console.error('Error playing applause:', error);
        });

        if (this.japaneseVoice) {
            const utterance = new SpeechSynthesisUtterance('すごい');
            utterance.voice = this.japaneseVoice;
            utterance.rate = 0.8;
            this.speechSynthesis.speak(utterance);
        }
    }

    show() {
        this.createConfetti();
        this.playSounds();
    }
} 