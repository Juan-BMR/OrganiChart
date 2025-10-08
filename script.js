class Particle {
    constructor(x, y, vx, vy, color, size) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.005;
        this.trail = [];
        this.maxTrailLength = 15;
    }

    update(gravity, friction, canvas) {
        // Physics
        this.vy += gravity;
        this.vx *= friction;
        this.vy *= friction;
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Add to trail
        if (particleSystem.showTrails) {
            this.trail.push({ x: this.x, y: this.y, life: this.life });
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }
        }
        
        // Update life
        this.life -= this.decay;
        
        // Bounce off edges
        if (this.x <= 0 || this.x >= canvas.width) {
            this.vx *= -0.8;
            this.x = Math.max(0, Math.min(canvas.width, this.x));
        }
        if (this.y <= 0 || this.y >= canvas.height) {
            this.vy *= -0.8;
            this.y = Math.max(0, Math.min(canvas.height, this.y));
        }
    }

    draw(ctx) {
        // Draw trail
        if (particleSystem.showTrails && this.trail.length > 1) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.stroke();
        }
        
        // Draw particle
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.size * 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.globalAlpha = 1;
    }

    isDead() {
        return this.life <= 0;
    }
}

class ParticleSystem {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.particles = [];
        this.mouse = { x: 0, y: 0, isDown: false };
        this.showTrails = true;
        
        // Settings
        this.particleCount = 20;
        this.gravity = 0.5;
        this.friction = 0.99;
        this.particleSize = 3;
        this.colorMode = 'rainbow';
        
        // Performance tracking
        this.lastTime = 0;
        this.frameCount = 0;
        this.fps = 60;
        
        this.setupEventListeners();
        this.setupControls();
        this.animate();
    }

    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouse.isDown = true;
            this.updateMousePosition(e);
            this.createParticles(this.mouse.x, this.mouse.y);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            this.updateMousePosition(e);
            if (this.mouse.isDown) {
                this.createParticles(this.mouse.x, this.mouse.y);
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.mouse.isDown = false;
        });

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = touch.clientX - rect.left;
            this.mouse.y = touch.clientY - rect.top;
            this.createParticles(this.mouse.x, this.mouse.y);
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = touch.clientX - rect.left;
            this.mouse.y = touch.clientY - rect.top;
            this.createParticles(this.mouse.x, this.mouse.y);
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }

    updateMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
    }

    setupControls() {
        // Particle count
        const particleCountSlider = document.getElementById('particleCount');
        const particleCountValue = document.getElementById('particleCountValue');
        particleCountSlider.addEventListener('input', (e) => {
            this.particleCount = parseInt(e.target.value);
            particleCountValue.textContent = this.particleCount;
        });

        // Gravity
        const gravitySlider = document.getElementById('gravity');
        const gravityValue = document.getElementById('gravityValue');
        gravitySlider.addEventListener('input', (e) => {
            this.gravity = parseFloat(e.target.value);
            gravityValue.textContent = this.gravity;
        });

        // Friction
        const frictionSlider = document.getElementById('friction');
        const frictionValue = document.getElementById('frictionValue');
        frictionSlider.addEventListener('input', (e) => {
            this.friction = parseFloat(e.target.value);
            frictionValue.textContent = this.friction;
        });

        // Particle size
        const particleSizeSlider = document.getElementById('particleSize');
        const particleSizeValue = document.getElementById('particleSizeValue');
        particleSizeSlider.addEventListener('input', (e) => {
            this.particleSize = parseInt(e.target.value);
            particleSizeValue.textContent = this.particleSize;
        });

        // Color mode
        const colorModeSelect = document.getElementById('colorMode');
        colorModeSelect.addEventListener('change', (e) => {
            this.colorMode = e.target.value;
        });

        // Clear canvas
        document.getElementById('clearCanvas').addEventListener('click', () => {
            this.particles = [];
        });

        // Toggle trails
        document.getElementById('toggleTrails').addEventListener('click', () => {
            this.showTrails = !this.showTrails;
        });
    }

    getColor() {
        switch (this.colorMode) {
            case 'rainbow':
                const hue = (Date.now() / 10) % 360;
                return `hsl(${hue + Math.random() * 60}, 70%, 60%)`;
            
            case 'fire':
                const fireColors = ['#ff4444', '#ff6600', '#ff8800', '#ffaa00', '#ffcc00'];
                return fireColors[Math.floor(Math.random() * fireColors.length)];
            
            case 'ocean':
                const oceanColors = ['#0066cc', '#0080ff', '#00aaff', '#00ccff', '#00ffff'];
                return oceanColors[Math.floor(Math.random() * oceanColors.length)];
            
            case 'galaxy':
                const galaxyColors = ['#6600cc', '#8800ff', '#aa00ff', '#cc00ff', '#ff00cc'];
                return galaxyColors[Math.floor(Math.random() * galaxyColors.length)];
            
            default:
                return '#ffffff';
        }
    }

    createParticles(x, y) {
        for (let i = 0; i < this.particleCount; i++) {
            const angle = (Math.PI * 2 * i) / this.particleCount + Math.random() * 0.5;
            const speed = Math.random() * 8 + 2;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const color = this.getColor();
            const size = this.particleSize + Math.random() * 2;
            
            this.particles.push(new Particle(x, y, vx, vy, color, size));
        }
    }

    update() {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(this.gravity, this.friction, this.canvas);
            
            if (particle.isDead()) {
                this.particles.splice(i, 1);
            }
        }

        // Update stats
        document.getElementById('particleStats').textContent = this.particles.length;
    }

    draw() {
        // Clear canvas with fade effect
        this.ctx.fillStyle = 'rgba(12, 12, 12, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw particles
        this.particles.forEach(particle => {
            particle.draw(this.ctx);
        });
    }

    animate(currentTime = 0) {
        // Calculate FPS
        if (currentTime - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = currentTime;
            document.getElementById('fpsCounter').textContent = this.fps;
        }
        this.frameCount++;

        this.update();
        this.draw();
        requestAnimationFrame((time) => this.animate(time));
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
}

// Initialize the application
let particleSystem;

window.addEventListener('load', () => {
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Initialize particle system
    particleSystem = new ParticleSystem(canvas, ctx);
    
    // Add some initial particles for demonstration
    setTimeout(() => {
        particleSystem.createParticles(window.innerWidth / 2, window.innerHeight / 2);
    }, 500);
});