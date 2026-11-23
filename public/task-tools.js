(function (root) {
    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    function filterTasks(tasks, { query = '', priority = '', assignee = '' } = {}) {
        const term = normalize(query.trim());
        return tasks.filter(task => {
            const members = task.assigneeIds?.length ? task.assigneeIds : [task.assigneeId].filter(Boolean);
            return (!priority || task.priority === priority) &&
                (!assignee || members.some(member => String(member._id || member) === assignee)) &&
                (!term || normalize([task.title, ...(task.tags || [])].join(' ')).includes(term));
        });
    }
    function isOverdue(task, today) {
        if (!today) {
            const now = new Date();
            today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        }
        return Boolean(task.dueDate && task.status !== 'DONE' && String(task.dueDate).slice(0, 10) < today);
    }
    const tools = { filterTasks, isOverdue };
    if (typeof module !== 'undefined' && module.exports) module.exports = tools;
    else root.TaskTools = tools;
})(globalThis);
