// State management
let todos = [];
let currentFilter = 'all';
let editingId = null;
let draggedElement = null;
let draggedIndex = null;

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

    // Event delegation for todo list items
    todoList.addEventListener('click', (e) => {
        const todoItem = e.target.closest('.todo-item');
        if (!todoItem) return;

        const todoId = parseInt(todoItem.dataset.id);

        // Handle checkbox toggle
        if (e.target.classList.contains('todo-checkbox')) {
            toggleTodo(todoId);
            return;
        }

        // Handle edit button
        if (e.target.closest('.btn-edit')) {
            startEdit(todoId);
            return;
        }

        // Handle delete button
        if (e.target.closest('.btn-delete')) {
            deleteTodo(todoId);
            return;
        }

        // Handle save button (in edit mode)
        if (e.target.closest('.btn-save')) {
            saveEditFromInput(todoId);
            return;
        }

        // Handle cancel button (in edit mode)
        if (e.target.closest('.btn-cancel')) {
            cancelEdit();
            return;
        }
    });

    // Handle keyboard events for edit input
    todoList.addEventListener('keydown', (e) => {
        if (e.target.classList.contains('todo-edit-input')) {
            const todoItem = e.target.closest('.todo-item');
            const todoId = parseInt(todoItem.dataset.id);

            if (e.key === 'Enter') {
                saveEditFromInput(todoId);
            } else if (e.key === 'Escape') {
                cancelEdit();
            }
        }
    });

    // Drag and drop event listeners
    todoList.addEventListener('dragstart', handleDragStart);
    todoList.addEventListener('dragover', handleDragOver);
    todoList.addEventListener('drop', handleDrop);
    todoList.addEventListener('dragend', handleDragEnd);
    todoList.addEventListener('dragenter', handleDragEnter);
    todoList.addEventListener('dragleave', handleDragLeave);
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
    // Focus the input after rendering
    setTimeout(() => {
        const editInput = document.getElementById(`edit-input-${id}`);
        if (editInput) {
            editInput.focus();
            editInput.setSelectionRange(editInput.value.length, editInput.value.length);
        }
    }, 0);
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
                <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}" draggable="false">
                    <input
                        type="text"
                        class="todo-edit-input"
                        value="${escapeHtml(todo.text)}"
                        id="edit-input-${todo.id}"
                    >
                    <div class="todo-actions">
                        <button class="btn-icon btn-save">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                        <button class="btn-icon btn-cancel">
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
            <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}" draggable="true">
                <div class="drag-handle">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </div>
                <div class="checkbox-wrapper">
                    <input
                        type="checkbox"
                        class="todo-checkbox"
                        ${todo.completed ? 'checked' : ''}
                    >
                </div>
                <span class="todo-text">${escapeHtml(todo.text)}</span>
                <div class="todo-actions">
                    <button class="btn-icon btn-edit">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon btn-delete">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </li>
        `;
    }).join('');

    updateTaskCount();
}

// Helper function to save edit from input
function saveEditFromInput(id) {
    const input = document.getElementById(`edit-input-${id}`);
    if (input) {
        saveEdit(id, input.value);
    }
}

// Drag and drop handlers
function handleDragStart(e) {
    const todoItem = e.target.closest('.todo-item');
    if (!todoItem) return;

    draggedElement = todoItem;
    draggedIndex = Array.from(todoList.children).indexOf(todoItem);

    todoItem.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', todoItem.innerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    const todoItem = e.target.closest('.todo-item');
    if (todoItem && todoItem !== draggedElement) {
        todoItem.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const todoItem = e.target.closest('.todo-item');
    if (todoItem) {
        todoItem.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    const dropTarget = e.target.closest('.todo-item');
    if (!dropTarget || dropTarget === draggedElement) {
        return false;
    }

    const dropIndex = Array.from(todoList.children).indexOf(dropTarget);

    // Reorder todos array
    const filteredTodos = getFilteredTodos();
    const draggedTodo = filteredTodos[draggedIndex];

    // Find the actual indices in the full todos array
    const draggedTodoId = draggedTodo.id;
    const dropTodoId = parseInt(dropTarget.dataset.id);

    const actualDraggedIndex = todos.findIndex(t => t.id === draggedTodoId);
    const actualDropIndex = todos.findIndex(t => t.id === dropTodoId);

    // Remove from old position
    const [movedTodo] = todos.splice(actualDraggedIndex, 1);

    // Insert at new position
    todos.splice(actualDropIndex, 0, movedTodo);

    saveTodos();
    renderTodos();

    return false;
}

function handleDragEnd(e) {
    const todoItem = e.target.closest('.todo-item');
    if (todoItem) {
        todoItem.classList.remove('dragging');
    }

    // Remove drag-over class from all items
    document.querySelectorAll('.todo-item').forEach(item => {
        item.classList.remove('drag-over');
    });

    draggedElement = null;
    draggedIndex = null;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
