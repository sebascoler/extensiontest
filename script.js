// State management
let todos = [];
let currentFilter = 'all';
let editingId = null;
let draggedElement = null;
let draggedIndex = null;
let selectedLabels = [];
let viewMode = 'flat'; // 'flat' or 'grouped'

// DOM elements
const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const todoContainer = document.getElementById('todoContainer');
const filterBtns = document.querySelectorAll('.filter-btn');
const taskCount = document.getElementById('taskCount');
const clearCompletedBtn = document.getElementById('clearCompleted');
const dateElement = document.getElementById('date');
const labelFiltersContainer = document.getElementById('labelFilters');
const flatViewBtn = document.getElementById('flatViewBtn');
const groupedViewBtn = document.getElementById('groupedViewBtn');

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

    // View toggle buttons
    flatViewBtn.addEventListener('click', () => {
        viewMode = 'flat';
        flatViewBtn.classList.add('active');
        groupedViewBtn.classList.remove('active');
        renderTodos();
    });

    groupedViewBtn.addEventListener('click', () => {
        viewMode = 'grouped';
        groupedViewBtn.classList.add('active');
        flatViewBtn.classList.remove('active');
        renderTodos();
    });

    // Event delegation for todo list items
    todoContainer.addEventListener('click', (e) => {
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
    todoContainer.addEventListener('keydown', (e) => {
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
    todoContainer.addEventListener('dragstart', handleDragStart);
    todoContainer.addEventListener('dragover', handleDragOver);
    todoContainer.addEventListener('drop', handleDrop);
    todoContainer.addEventListener('dragend', handleDragEnd);
    todoContainer.addEventListener('dragenter', handleDragEnter);
    todoContainer.addEventListener('dragleave', handleDragLeave);
}

// Load todos from Chrome storage
function loadTodos() {
    chrome.storage.local.get(['todos'], (result) => {
        todos = result.todos || [];

        // Migrate old todos without labels
        todos = todos.map(todo => ({
            ...todo,
            labels: todo.labels || []
        }));

        renderTodos();
        renderLabelFilters();
        updateTaskCount();
    });
}

// Save todos to Chrome storage
function saveTodos() {
    chrome.storage.local.set({ todos }, () => {
        updateTaskCount();
    });
}

// Extract labels from text (words starting with #)
function extractLabels(text) {
    const labelRegex = /#(\w+)/g;
    const labels = [];
    let match;
    while ((match = labelRegex.exec(text)) !== null) {
        labels.push(match[1].toLowerCase());
    }
    return labels;
}

// Remove labels from text
function removeLabelsFromText(text) {
    return text.replace(/#\w+/g, '').replace(/\s+/g, ' ').trim();
}

// Add new todo
function addTodo() {
    const inputText = todoInput.value.trim();
    if (!inputText) return;

    const labels = extractLabels(inputText);
    const text = removeLabelsFromText(inputText);

    if (!text) return; // Don't create empty todos

    const todo = {
        id: Date.now(),
        text,
        labels,
        completed: false,
        createdAt: new Date().toISOString()
    };

    todos.unshift(todo);
    todoInput.value = '';
    saveTodos();
    renderTodos();
    renderLabelFilters();
}

// Toggle todo completion
function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;

        // Move completed tasks to bottom
        if (todo.completed) {
            const index = todos.indexOf(todo);
            todos.splice(index, 1);
            todos.push(todo);
        }

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
            renderLabelFilters();
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
function saveEdit(id, inputText) {
    const labels = extractLabels(inputText);
    const text = removeLabelsFromText(inputText);

    if (!text) {
        deleteTodo(id);
        return;
    }

    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.text = text;
        todo.labels = labels;
        editingId = null;
        saveTodos();
        renderTodos();
        renderLabelFilters();
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
        renderLabelFilters();
    }, 300);
}

// Get all unique labels from todos
function getAllLabels() {
    const labelSet = new Set();
    todos.forEach(todo => {
        if (todo.labels) {
            todo.labels.forEach(label => labelSet.add(label));
        }
    });
    return Array.from(labelSet).sort();
}

// Filter todos based on current filter and selected labels
function getFilteredTodos() {
    let filtered = todos;

    // Filter by completion status
    switch (currentFilter) {
        case 'active':
            filtered = filtered.filter(t => !t.completed);
            break;
        case 'completed':
            filtered = filtered.filter(t => t.completed);
            break;
    }

    // Filter by selected labels
    if (selectedLabels.length > 0) {
        filtered = filtered.filter(todo => {
            if (!todo.labels || todo.labels.length === 0) return false;
            return selectedLabels.every(selectedLabel =>
                todo.labels.includes(selectedLabel)
            );
        });
    }

    return filtered;
}

// Render label filters
function renderLabelFilters() {
    const allLabels = getAllLabels();

    if (allLabels.length === 0) {
        labelFiltersContainer.innerHTML = '';
        return;
    }

    labelFiltersContainer.innerHTML = allLabels.map(label => {
        const count = todos.filter(todo =>
            todo.labels && todo.labels.includes(label)
        ).length;
        const isActive = selectedLabels.includes(label);

        return `
            <button class="label-filter-chip ${isActive ? 'active' : ''}" data-label="${label}">
                ${label}
                <span class="count">${count}</span>
            </button>
        `;
    }).join('');

    // Add event listeners to label filter chips
    document.querySelectorAll('.label-filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const label = chip.dataset.label;
            toggleLabelFilter(label);
        });
    });
}

// Toggle label filter
function toggleLabelFilter(label) {
    const index = selectedLabels.indexOf(label);
    if (index > -1) {
        selectedLabels.splice(index, 1);
    } else {
        selectedLabels.push(label);
    }
    renderLabelFilters();
    renderTodos();
}

// Update task count
function updateTaskCount() {
    const activeCount = todos.filter(t => !t.completed).length;
    const text = activeCount === 1 ? 'task' : 'tasks';
    taskCount.textContent = `${activeCount} ${text}`;
}

// Render a single todo item
function renderTodoItem(todo) {
    if (editingId === todo.id) {
        const editValue = todo.text + (todo.labels && todo.labels.length > 0 ? ' #' + todo.labels.join(' #') : '');
        return `
            <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}" draggable="false">
                <input
                    type="text"
                    class="todo-edit-input"
                    value="${escapeHtml(editValue)}"
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

    const labelsHtml = todo.labels && todo.labels.length > 0
        ? `<div class="todo-labels">
             ${todo.labels.map(label => `<span class="todo-label">${escapeHtml(label)}</span>`).join('')}
           </div>`
        : '';

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
            <div class="todo-content">
                <span class="todo-text">${escapeHtml(todo.text)}</span>
                ${labelsHtml}
            </div>
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
}

// Render todos in flat view
function renderFlatView(filteredTodos) {
    if (filteredTodos.length === 0) {
        return `
            <ul class="todo-list">
                <div class="empty-state">
                    <div class="empty-state-icon">✨</div>
                    <div class="empty-state-text">
                        ${currentFilter === 'completed' ? 'No completed tasks' :
                          currentFilter === 'active' ? 'No active tasks' :
                          'No tasks yet. Add one to get started!'}
                    </div>
                </div>
            </ul>
        `;
    }

    return `
        <ul id="todoList" class="todo-list">
            ${filteredTodos.map(todo => renderTodoItem(todo)).join('')}
        </ul>
    `;
}

// Render todos in grouped view
function renderGroupedView(filteredTodos) {
    if (filteredTodos.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">✨</div>
                <div class="empty-state-text">No tasks to display</div>
            </div>
        `;
    }

    // Group todos by their labels
    const groups = {};
    const noLabelTodos = [];

    filteredTodos.forEach(todo => {
        if (!todo.labels || todo.labels.length === 0) {
            noLabelTodos.push(todo);
        } else {
            // Add todo to each of its labels
            todo.labels.forEach(label => {
                if (!groups[label]) {
                    groups[label] = [];
                }
                groups[label].push(todo);
            });
        }
    });

    let html = '';

    // Render labeled groups
    Object.keys(groups).sort().forEach(label => {
        const todosInGroup = groups[label];
        html += `
            <div class="label-group">
                <div class="label-group-header">
                    <div class="label-group-title">
                        <span class="label-group-badge">${escapeHtml(label)}</span>
                        <span class="label-group-count">${todosInGroup.length} ${todosInGroup.length === 1 ? 'task' : 'tasks'}</span>
                    </div>
                </div>
                <ul class="todo-list">
                    ${todosInGroup.map(todo => renderTodoItem(todo)).join('')}
                </ul>
            </div>
        `;
    });

    // Render no-label group if there are any
    if (noLabelTodos.length > 0) {
        html += `
            <div class="label-group">
                <div class="label-group-header">
                    <div class="label-group-title">
                        <span class="label-group-badge">No Label</span>
                        <span class="label-group-count">${noLabelTodos.length} ${noLabelTodos.length === 1 ? 'task' : 'tasks'}</span>
                    </div>
                </div>
                <ul class="todo-list">
                    ${noLabelTodos.map(todo => renderTodoItem(todo)).join('')}
                </ul>
            </div>
        `;
    }

    return html;
}

// Render todos
function renderTodos() {
    const filteredTodos = getFilteredTodos();

    if (viewMode === 'flat') {
        todoContainer.innerHTML = renderFlatView(filteredTodos);
    } else {
        todoContainer.innerHTML = renderGroupedView(filteredTodos);
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

// Drag and drop handlers
function handleDragStart(e) {
    const todoItem = e.target.closest('.todo-item');
    if (!todoItem) return;

    draggedElement = todoItem;
    const parentList = todoItem.closest('.todo-list');
    if (parentList) {
        draggedIndex = Array.from(parentList.children).indexOf(todoItem);
    }

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

    // Find the actual indices in the full todos array
    const draggedTodoId = parseInt(draggedElement.dataset.id);
    const dropTodoId = parseInt(dropTarget.dataset.id);

    const actualDraggedIndex = todos.findIndex(t => t.id === draggedTodoId);
    const actualDropIndex = todos.findIndex(t => t.id === dropTodoId);

    // Remove from old position
    const [movedTodo] = todos.splice(actualDraggedIndex, 1);

    // Insert at new position
    todos.splice(actualDropIndex, 0, movedTodo);

    saveTodos();
    renderTodos();
    renderLabelFilters();

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
