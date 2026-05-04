import React from 'react';

export interface TodoItem {
    id: number;
    status: 'pending' | 'in_progress' | 'completed';
    content?: string;
}

export interface ToDoListProps {
    todos: TodoItem[];
}

const getStatusIcon = (status: TodoItem['status']): string => {
    switch (status) {
        case 'completed':
            return '✓';
        case 'in_progress':
            return '⟳';
        case 'pending':
            return '○';
        default:
            return '○';
    }
};

const getStatusClass = (status: TodoItem['status']): string => {
    return `todo-status-${status}`;
};

export const ToDoList: React.FC<ToDoListProps> = ({ todos }) => {
    return (
        <div className="todo-list-container">
            <div className="todo-list">
                {todos.map((todo) => (
                    <div key={todo.id} className={`todo-item ${getStatusClass(todo.status)}`}>
                        <span className="todo-icon">{getStatusIcon(todo.status)}</span>
                        <div className="todo-content">
                            {todo.content && <span className="todo-description">{todo.content}</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
