// Main Application JavaScript for TaskFlow
class TaskFlowApp {
    constructor() {
        this.user = null;
        this.tasks = {
            todo: [],
            completed: [],
            archived: []
        };
        this.currentActiveStage = 'todo';
        
        this.init();
    }

    async init() {
        // Check authentication
        if (!this.checkAuthentication()) {
            return;
        }
        
        // Initialize UI elements
        this.initializeElements();
        
        // Load user data
        this.loadUserData();
        
        // Load tasks
        await this.loadTasks();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('TaskFlow app initialized successfully');
    }

    checkAuthentication() {
        try {
            const userData = localStorage.getItem('taskflow_user');
            if (!userData) {
                console.log('No user data found, redirecting to landing page');
                window.location.href = 'index.html';
                return false;
            }
            
            this.user = JSON.parse(userData);
            
            // Validate user data
            if (!this.user.name || !this.user.dateOfBirth) {
                console.log('Invalid user data, redirecting to landing page');
                localStorage.removeItem('taskflow_user');
                window.location.href = 'index.html';
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error checking authentication:', error);
            localStorage.removeItem('taskflow_user');
            window.location.href = 'index.html';
            return false;
        }
    }

    initializeElements() {
        // Form elements
        this.taskForm = document.getElementById('taskForm');
        this.taskInput = document.getElementById('taskInput');
        this.activeStageLabel = document.getElementById('activeStageLabel');
        
        // User elements
        this.userNameElement = document.getElementById('userName');
        this.userAvatarElement = document.getElementById('userAvatar');
        this.signOutBtn = document.getElementById('signOutBtn');
        
        // Task containers
        this.todoContainer = document.getElementById('todoTasks');
        this.completedContainer = document.getElementById('completedTasks');
        this.archivedContainer = document.getElementById('archivedTasks');
        
        // Counters
        this.todoCount = document.getElementById('todoCount');
        this.completedCount = document.getElementById('completedCount');
        this.archivedCount = document.getElementById('archivedCount');
        
        // Stage elements
        this.stageElements = document.querySelectorAll('.task-stage');
        
        // Loading modal
        this.loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));
    }

    loadUserData() {
        // Set user name
        this.userNameElement.textContent = this.user.name;
        
        // Set user avatar using UI Avatars API
        const avatarUrl = `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(this.user.name)}`;
        this.userAvatarElement.src = avatarUrl;
        this.userAvatarElement.alt = `${this.user.name}'s Avatar`;
    }

    async loadTasks() {
        try {
            // Check if tasks exist in localStorage
            const storedTasks = localStorage.getItem('taskflow_tasks');
            
            if (storedTasks) {
                this.tasks = JSON.parse(storedTasks);
                console.log('Loaded tasks from localStorage');
            } else {
                // First time user - load dummy data
                console.log('Loading initial dummy data from API');
                this.loadingModal.show();
                await this.loadDummyData();
                this.loadingModal.hide();
            }
            
            this.renderAllTasks();
            this.updateCounters();
            
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.loadingModal.hide();
            this.showError('Failed to load tasks. Starting with empty task list.');
        }
    }

    async loadDummyData() {
        try {
            const response = await fetch('https://dummyjson.com/todos');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Transform API data to our task structure
            this.tasks.todo = data.todos.slice(0, 10).map(item => ({
                id: this.generateTaskId(),
                text: item.todo,
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                stage: 'todo'
            }));
            
            // Save to localStorage
            this.saveTasks();
            console.log(`Loaded ${this.tasks.todo.length} dummy tasks`);
            
        } catch (error) {
            console.error('Error loading dummy data:', error);
            // Create some fallback tasks if API fails
            this.createFallbackTasks();
        }
    }

    createFallbackTasks() {
        const fallbackTasks = [
            'Welcome to TaskFlow! This is your first task.',
            'Try moving tasks between different stages',
            'Click the buttons to mark tasks as completed',
            'Archive tasks you no longer need',
            'Add your own tasks using the input above'
        ];
        
        this.tasks.todo = fallbackTasks.map(text => ({
            id: this.generateTaskId(),
            text: text,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            stage: 'todo'
        }));
        
        this.saveTasks();
        console.log('Created fallback tasks');
    }

    setupEventListeners() {
        // Task form submission
        this.taskForm.addEventListener('submit', (e) => this.handleTaskSubmit(e));
        
        // Sign out button
        this.signOutBtn.addEventListener('click', () => this.handleSignOut());
        
        // Stage selection
        this.stageElements.forEach(stage => {
            stage.addEventListener('click', () => this.selectStage(stage.dataset.stage));
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    handleTaskSubmit(e) {
        e.preventDefault();
        
        const taskText = this.taskInput.value.trim();
        
        if (!taskText) {
            this.showFieldError(this.taskInput, 'Please enter a task description');
            return;
        }
        
        if (taskText.length > 500) {
            this.showFieldError(this.taskInput, 'Task description is too long (max 500 characters)');
            return;
        }
        
        this.addTask(taskText, this.currentActiveStage);
        this.taskInput.value = '';
        this.clearFieldError(this.taskInput);
        
        // Focus back on input for better UX
        this.taskInput.focus();
    }

    addTask(text, stage) {
        const task = {
            id: this.generateTaskId(),
            text: text,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            stage: stage
        };
        
        this.tasks[stage].push(task);
        this.saveTasks();
        this.renderStage(stage);
        this.updateCounters();
        
        // Show success feedback
        this.showSuccess(`Task added to ${this.capitalizeFirst(stage)}!`);
        
        console.log(`Task added to ${stage}:`, task);
    }

    moveTask(taskId, fromStage, toStage) {
        const taskIndex = this.tasks[fromStage].findIndex(task => task.id === taskId);
        
        if (taskIndex === -1) {
            console.error('Task not found:', taskId);
            return;
        }
        
        const task = this.tasks[fromStage].splice(taskIndex, 1)[0];
        task.stage = toStage;
        task.lastModified = new Date().toISOString();
        
        this.tasks[toStage].push(task);
        this.saveTasks();
        
        this.renderStage(fromStage);
        this.renderStage(toStage);
        this.updateCounters();
        
        console.log(`Task moved from ${fromStage} to ${toStage}:`, task);
    }

    deleteTask(taskId, stage) {
        const taskIndex = this.tasks[stage].findIndex(task => task.id === taskId);
        
        if (taskIndex === -1) {
            console.error('Task not found:', taskId);
            return;
        }
        
        this.tasks[stage].splice(taskIndex, 1);
        this.saveTasks();
        this.renderStage(stage);
        this.updateCounters();
        
        console.log(`Task deleted from ${stage}:`, taskId);
    }

    selectStage(stage) {
        this.currentActiveStage = stage;
        this.activeStageLabel.textContent = this.capitalizeFirst(stage);
        
        // Update visual feedback
        this.stageElements.forEach(el => {
            el.classList.remove('active');
        });
        
        document.querySelector(`[data-stage="${stage}"]`).classList.add('active');
    }

    renderAllTasks() {
        this.renderStage('todo');
        this.renderStage('completed');
        this.renderStage('archived');
    }

    renderStage(stage) {
        const container = this.getContainerForStage(stage);
        const tasks = this.tasks[stage];
        
        if (tasks.length === 0) {
            container.innerHTML = this.getEmptyStateHTML(stage);
            return;
        }
        
        container.innerHTML = tasks.map(task => this.createTaskHTML(task)).join('');
        
        // Add event listeners to task buttons
        container.querySelectorAll('.task-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleTaskAction(e));
        });
    }

    createTaskHTML(task) {
        const actions = this.getTaskActions(task.stage);
        const timestamp = this.formatTimestamp(task.lastModified);
        
        return `
            <div class="task-card card slide-in" data-task-id="${task.id}">
                <div class="card-body p-3">
                    <div class="task-content mb-2">${this.escapeHTML(task.text)}</div>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="task-timestamp text-muted">
                            <i class="fas fa-clock me-1"></i>${timestamp}
                        </small>
                        <div class="task-actions">
                            ${actions.map(action => `
                                <button class="btn btn-${action.variant} btn-sm task-action-btn" 
                                        data-action="${action.action}" 
                                        data-task-id="${task.id}" 
                                        data-current-stage="${task.stage}"
                                        title="${action.title}">
                                    <i class="fas fa-${action.icon}"></i>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getTaskActions(stage) {
        const actions = [];
        
        switch (stage) {
            case 'todo':
                actions.push(
                    { action: 'complete', icon: 'check', variant: 'success', title: 'Mark as Completed' },
                    { action: 'archive', icon: 'archive', variant: 'secondary', title: 'Archive Task' }
                );
                break;
            case 'completed':
                actions.push(
                    { action: 'todo', icon: 'undo', variant: 'primary', title: 'Move to Todo' },
                    { action: 'archive', icon: 'archive', variant: 'secondary', title: 'Archive Task' }
                );
                break;
            case 'archived':
                actions.push(
                    { action: 'todo', icon: 'list', variant: 'primary', title: 'Move to Todo' },
                    { action: 'complete', icon: 'check', variant: 'success', title: 'Mark as Completed' }
                );
                break;
        }
        
        return actions;
    }

    handleTaskAction(e) {
        const button = e.currentTarget;
        const action = button.dataset.action;
        const taskId = button.dataset.taskId;
        const currentStage = button.dataset.currentStage;
        
        let targetStage;
        switch (action) {
            case 'complete':
                targetStage = 'completed';
                break;
            case 'todo':
                targetStage = 'todo';
                break;
            case 'archive':
                targetStage = 'archived';
                break;
            default:
                console.error('Unknown action:', action);
                return;
        }
        
        this.moveTask(taskId, currentStage, targetStage);
        this.showSuccess(`Task moved to ${this.capitalizeFirst(targetStage)}!`);
    }

    getContainerForStage(stage) {
        switch (stage) {
            case 'todo': return this.todoContainer;
            case 'completed': return this.completedContainer;
            case 'archived': return this.archivedContainer;
            default: throw new Error(`Unknown stage: ${stage}`);
        }
    }

    getEmptyStateHTML(stage) {
        const messages = {
            todo: { icon: 'clipboard-list', text: 'No tasks yet. Add your first task above!' },
            completed: { icon: 'trophy', text: 'No completed tasks yet. Keep working!' },
            archived: { icon: 'box', text: 'No archived tasks yet.' }
        };
        
        const message = messages[stage];
        return `
            <div class="empty-state p-4 text-center text-muted">
                <i class="fas fa-${message.icon} fs-1 mb-3 opacity-50"></i>
                <p>${message.text}</p>
            </div>
        `;
    }

    updateCounters() {
        this.todoCount.textContent = this.tasks.todo.length;
        this.completedCount.textContent = this.tasks.completed.length;
        this.archivedCount.textContent = this.tasks.archived.length;
    }

    saveTasks() {
        try {
            localStorage.setItem('taskflow_tasks', JSON.stringify(this.tasks));
        } catch (error) {
            console.error('Error saving tasks:', error);
            this.showError('Failed to save tasks. Your changes may be lost.');
        }
    }

    handleSignOut() {
        if (confirm('Are you sure you want to sign out? All your data will be cleared.')) {
            localStorage.removeItem('taskflow_user');
            localStorage.removeItem('taskflow_tasks');
            window.location.href = 'index.html';
        }
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + Enter to submit task
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && document.activeElement === this.taskInput) {
            e.preventDefault();
            this.taskForm.dispatchEvent(new Event('submit'));
        }
        
        // Escape to clear input
        if (e.key === 'Escape' && document.activeElement === this.taskInput) {
            this.taskInput.value = '';
            this.taskInput.blur();
        }
    }

    // Utility methods
    generateTaskId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    formatTimestamp(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showFieldError(field, message) {
        field.classList.add('is-invalid');
        const feedback = field.nextElementSibling;
        if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.textContent = message;
        }
    }

    clearFieldError(field) {
        field.classList.remove('is-invalid');
        const feedback = field.nextElementSibling;
        if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.textContent = '';
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} 
                          position-fixed top-0 end-0 m-3 fade-in`;
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
            ${message}
        `;
        
        document.body.appendChild(toast);
        
        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TaskFlowApp();
});