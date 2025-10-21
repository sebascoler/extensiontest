// State management
let todos = [];
let currentFilter = 'all';
let editingId = null;

// DOM elements
const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const filterBtns = document.querySelectorAll('.filter-btn');
const taskCount = document.getElementById('taskCount');
const clearCompletedBtn = document.getElementById('clearCompleted');
const dateElement = document.getElementById('date');

// Initialize
init();

function init() {
    loadTodos();
    renderTodos();
    updateTaskCount();
    displayDate();
    setupEventListeners();
}

// Display current date
function displayDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    dateElement.textContent = today.toLocaleDateString('en-US', options);
}

// Setup event listeners
function setupEventListeners() {
    addBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTodos();
        });
    });

    clearCompletedBtn.addEventListener('click', clearCompleted);
}

// Load todos from Chrome storage
function loadTodos() {
    chrome.storage.local.get(['todos'], (result) => {
        todos = result.todos || [];
        renderTodos();
        updateTaskCount();
    });
}

// Save todos to Chrome storage
function saveTodos() {
    chrome.storage.local.set({ todos }, () => {
        updateTaskCount();
    });
}

// Add new todo
function addTodo() {
    const text = todoInput.value.trim();
    if (!text) return;

    const todo = {
        id: Date.now(),
        text,
        completed: false,
        createdAt: new Date().toISOString()
    };

    todos.unshift(todo);
    todoInput.value = '';
    saveTodos();
    renderTodos();
}

// Toggle todo completion
function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveTodos();
        renderTodos();
    }
}

// Delete todo
function deleteTodo(id) {
    const todoElement = document.querySelector(`[data-id="${id}"]`);
    if (todoElement) {
        todoElement.classList.add('removing');
        setTimeout(() => {
            todos = todos.filter(t => t.id !== id);
            saveTodos();
            renderTodos();
        }, 300);
    }
}

// Start editing todo
function startEdit(id) {
    editingId = id;
    renderTodos();
}

// Save edited todo
function saveEdit(id, newText) {
    const text = newText.trim();
    if (!text) {
        deleteTodo(id);
        return;
    }

    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.text = text;
        editingId = null;
        saveTodos();
        renderTodos();
    }
}

// Cancel editing
function cancelEdit() {
    editingId = null;
    renderTodos();
}

// Clear completed todos
function clearCompleted() {
    const completedTodos = todos.filter(t => t.completed);

    completedTodos.forEach(todo => {
        const todoElement = document.querySelector(`[data-id="${todo.id}"]`);
        if (todoElement) {
            todoElement.classList.add('removing');
        }
    });

    setTimeout(() => {
        todos = todos.filter(t => !t.completed);
        saveTodos();
        renderTodos();
    }, 300);
}

// Filter todos based on current filter
function getFilteredTodos() {
    switch (currentFilter) {
        case 'active':
            return todos.filter(t => !t.completed);
        case 'completed':
            return todos.filter(t => t.completed);
        default:
            return todos;
    }
}

// Update task count
function updateTaskCount() {
    const activeCount = todos.filter(t => !t.completed).length;
    const text = activeCount === 1 ? 'task' : 'tasks';
    taskCount.textContent = `${activeCount} ${text}`;
}

// Render todos
function renderTodos() {
    const filteredTodos = getFilteredTodos();

    if (filteredTodos.length === 0) {
        todoList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✨</div>
                <div class="empty-state-text">
                    ${currentFilter === 'completed' ? 'No completed tasks' :
                      currentFilter === 'active' ? 'No active tasks' :
                      'No tasks yet. Add one to get started!'}
                </div>
            </div>
        `;
        return;
    }

    todoList.innerHTML = filteredTodos.map(todo => {
        if (editingId === todo.id) {
            return `
                <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                    <input
                        type="text"
                        class="todo-edit-input"
                        value="${escapeHtml(todo.text)}"
                        id="edit-input-${todo.id}"
                    >
                    <div class="todo-actions">
                        <button class="btn-icon btn-save" onclick="saveEditFromInput(${todo.id})">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                        <button class="btn-icon btn-cancel" onclick="cancelEdit()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </li>
            `;
        }

        return `
            <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                <div class="checkbox-wrapper">
                    <input
                        type="checkbox"
                        class="todo-checkbox"
                        ${todo.completed ? 'checked' : ''}
                        onclick="toggleTodo(${todo.id})"
                    >
                </div>
                <span class="todo-text">${escapeHtml(todo.text)}</span>
                <div class="todo-actions">
                    <button class="btn-icon btn-edit" onclick="startEdit(${todo.id})">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteTodo(${todo.id})">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </li>
        `;
    }).join('');

    // Focus on edit input if editing
    if (editingId) {
        const editInput = document.getElementById(`edit-input-${editingId}`);
        if (editInput) {
            editInput.focus();
            editInput.setSelectionRange(editInput.value.length, editInput.value.length);

            editInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveEditFromInput(editingId);
                }
            });

            editInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    cancelEdit();
                }
            });
        }
    }

    updateTaskCount();
}

// Helper function to save edit from input
function saveEditFromInput(id) {
    const input = document.getElementById(`edit-input-${id}`);
    if (input) {
        saveEdit(id, input.value);
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally available
window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;
window.startEdit = startEdit;
window.saveEdit = saveEdit;
window.saveEditFromInput = saveEditFromInput;
window.cancelEdit = cancelEdit;
