class PresentationEngine {
    constructor() {
        this.currentSlideIndex = 0;
        this.slides = [];
        this.state = {
            isFullscreen: false,
            tool: 'none', // none, laser, pen, whiteboard
            isDrawing: false,
            penColor: 'red',
            penWidth: 3
        };

        // DOM Elements
        this.slideContainer = document.getElementById('slide-container');
        this.laserPointer = document.getElementById('laser-pointer');
        this.drawingCanvas = document.getElementById('drawing-canvas');
        this.whiteboardCanvas = document.getElementById('whiteboard-canvas');
        this.whiteboardModal = document.getElementById('whiteboard-modal');
        this.ctx = this.drawingCanvas.getContext('2d');
        this.wbCtx = this.whiteboardCanvas.getContext('2d');
        this.slideCounter = document.getElementById('slide-counter');

        this.init();
    }

    init() {
        this.updateSlideList();
        this.updateCounter();
        this.resizeCanvases();

        // Event Listeners
        window.addEventListener('resize', () => this.resizeCanvases());
        document.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Toolbar Buttons
        document.getElementById('btn-prev').onclick = () => this.prevSlide();
        document.getElementById('btn-next').onclick = () => this.nextSlide();
        document.getElementById('btn-fullscreen').onclick = () => this.toggleFullscreen();
        document.getElementById('btn-laser').onclick = () => this.toggleTool('laser');
        document.getElementById('btn-pen').onclick = () => this.toggleTool('pen');
        document.getElementById('btn-whiteboard').onclick = () => this.toggleTool('whiteboard');
        document.getElementById('btn-clear').onclick = () => this.clearDrawings();
        document.getElementById('close-whiteboard').onclick = () => this.toggleTool('none');

        // Mouse Handling for Tools
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        this.updateSlideVisibility();
    }

    updateSlideList() {
        this.slides = document.querySelectorAll('.slide');
    }

    updateCounter() {
        if (this.slideCounter) {
            this.slideCounter.innerText = `${this.currentSlideIndex + 1} / ${this.slides.length}`;
        }
    }

    updateSlideVisibility() {
        this.slides.forEach((slide, index) => {
            if (index === this.currentSlideIndex) {
                slide.classList.add('active');
            } else {
                slide.classList.remove('active');
            }
        });
        this.updateCounter();
    }

    nextSlide() {
        if (this.currentSlideIndex < this.slides.length - 1) {
            this.currentSlideIndex++;
            this.updateSlideVisibility();
        }
    }

    prevSlide() {
        if (this.currentSlideIndex > 0) {
            this.currentSlideIndex--;
            this.updateSlideVisibility();
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }

    handleKeydown(e) {
        // Navigation
        if (['ArrowRight', 'Space', 'Enter'].includes(e.code) || e.target.tagName === 'BODY' && e.key === ' ') {
            this.nextSlide();
        } else if (['ArrowLeft', 'Backspace'].includes(e.code)) {
            this.prevSlide();
        } else if (e.code === 'F11') {
            e.preventDefault();
            this.toggleFullscreen();
        } else if (e.key.toLowerCase() === 'l') {
            this.toggleTool('laser');
        } else if (e.key.toLowerCase() === 'p') {
            this.toggleTool('pen');
        } else if (e.key.toLowerCase() === 'w') {
            this.toggleTool('whiteboard');
        } else if (e.key.toLowerCase() === 'c') {
            this.clearDrawings();
        } else if (e.key === 'Escape') {
            if (this.state.tool !== 'none') {
                this.toggleTool('none');
            }
        }
    }

    toggleTool(toolName) {
        if (this.state.tool === toolName) {
            this.state.tool = 'none'; // Toggle off
        } else {
            this.state.tool = toolName;
        }

        // Reset UI actions
        this.laserPointer.style.display = 'none';
        this.drawingCanvas.classList.remove('active');
        this.whiteboardModal.classList.add('hidden');

        // Remove active class from buttons
        document.querySelectorAll('#toolbar button').forEach(btn => btn.classList.remove('active'));

        if (this.state.tool === 'laser') {
            document.getElementById('btn-laser').classList.add('active');
            this.laserPointer.style.display = 'block';
            document.body.style.cursor = 'none';
        } else if (this.state.tool === 'pen') {
            document.getElementById('btn-pen').classList.add('active');
            this.drawingCanvas.classList.add('active');
            document.body.style.cursor = 'default';
        } else if (this.state.tool === 'whiteboard') {
            document.getElementById('btn-whiteboard').classList.add('active');
            this.whiteboardModal.classList.remove('hidden');
            document.body.style.cursor = 'default';
        } else {
            document.body.style.cursor = 'default';
        }
    }

    resizeCanvases() {
        this.drawingCanvas.width = window.innerWidth;
        this.drawingCanvas.height = window.innerHeight;
        this.whiteboardCanvas.width = window.innerWidth;
        this.whiteboardCanvas.height = window.innerHeight;
    }

    // Input Handling for tools
    handleMouseMove(e) {
        if (this.state.tool === 'laser') {
            this.laserPointer.style.left = e.clientX + 'px';
            this.laserPointer.style.top = e.clientY + 'px';
        } else if (this.state.tool === 'pen' && this.state.isDrawing) {
            this.draw(this.ctx, e.clientX, e.clientY);
        } else if (this.state.tool === 'whiteboard' && this.state.isDrawing) {
            this.draw(this.wbCtx, e.clientX, e.clientY);
        }
    }

    handleMouseDown(e) {
        if (this.state.tool === 'pen' || this.state.tool === 'whiteboard') {
            this.state.isDrawing = true;
            const context = this.state.tool === 'pen' ? this.ctx : this.wbCtx;
            context.beginPath();
            context.moveTo(e.clientX, e.clientY);
            context.strokeStyle = this.state.penColor; // Default red, can be configurable
            context.lineWidth = this.state.penWidth;
            context.lineCap = 'round';
        }
    }

    handleMouseUp(e) {
        this.state.isDrawing = false;
        if (this.state.tool === 'pen') this.ctx.closePath();
        if (this.state.tool === 'whiteboard') this.wbCtx.closePath();
    }

    draw(context, x, y) {
        context.lineTo(x, y);
        context.stroke();
    }

    clearDrawings() {
        if (this.state.tool === 'whiteboard') {
            this.wbCtx.clearRect(0, 0, this.whiteboardCanvas.width, this.whiteboardCanvas.height);
        } else {
            this.ctx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        }
    }
}

// Initialize Engine
const engine = new PresentationEngine();
