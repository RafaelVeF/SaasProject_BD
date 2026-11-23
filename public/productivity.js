function escapeText(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
}

function openTaskHistory(taskId) {
    const task = tasks.find(item => item._id === taskId);
    if (!task) return;
    const labels = { title: 'Titre', description: 'Description', status: 'Statut', priority: 'Priorité',
        tags: 'Tags', dueDate: 'Échéance', assigneeIds: 'Assignations' };
    const actions = { created: 'Création', updated: 'Modification', commented: 'Commentaire ajouté' };
    document.getElementById('activityTitle').textContent = `Historique · ${task.title}`;
    document.getElementById('activityList').innerHTML = [...(task.history || [])].reverse().map(entry => `
        <article class="border border-slate-200 dark:border-anthracite-700 rounded-xl p-3 text-sm">
            <p class="font-bold">${escapeText(actions[entry.action] || entry.action)} · ${escapeText(entry.actorName)}</p>
            <time class="text-xs text-slate-500 dark:text-slate-400">${escapeText(new Date(entry.createdAt).toLocaleString('fr-FR'))}</time>
            ${(entry.changes || []).map(change => `<p class="text-xs mt-2 break-words"><strong>${escapeText(labels[change.field] || change.field)}</strong> :
                ${escapeText(change.before || 'Vide')} → ${escapeText(change.after || 'Vide')}</p>`).join('')}
        </article>`).join('') || '<p class="dialog-message">Aucun historique enregistré pour cette ancienne tâche.</p>';
    document.getElementById('activityDialog').showModal();
}

async function toggleProjectArchive(projectId) {
    const project = projects.find(item => item._id === projectId);
    if (!project) return;
    const archived = !project.archived;
    if (!await showConfirmation(archived ? 'Archiver ce projet sans supprimer ses tâches ?' : 'Restaurer ce projet dans les projets actifs ?',
        { title: archived ? 'Archiver le projet' : 'Restaurer le projet', acceptLabel: archived ? 'Archiver' : 'Restaurer' })) return;
    try {
        await api(`/api/projects/${projectId}`, { method: 'PUT', body: JSON.stringify({ archived }) });
        await loadProjects();
        if (currentProject?._id === projectId) {
            currentProject = projects.find(item => item._id === projectId);
            await selectProject(projectId);
        }
    } catch (error) { console.error(error); }
}

let notificationRequestVersion = 0;
let notificationItems = [];
async function refreshNotifications() {
    const version = ++notificationRequestVersion;
    const companyId = currentCompanyId;
    const userId = currentUserId;
    notificationItems = [];
    document.getElementById('notificationCount').textContent = '0';
    document.getElementById('notificationsList').textContent = 'Chargement…';
    if (!companyId || !userId) {
        document.getElementById('notificationsList').textContent = 'Aucun utilisateur sélectionné.';
        return;
    }
    try {
        const result = await api('/api/notifications');
        if (version !== notificationRequestVersion || companyId !== currentCompanyId || userId !== currentUserId) return;
        notificationItems = result.items;
        document.getElementById('notificationCount').textContent = String(result.unreadCount);
        document.getElementById('notificationsList').innerHTML = notificationItems.map(item => `
            <button type="button" onclick="openNotification('${item._id}')" class="w-full text-left border border-slate-200 dark:border-anthracite-700 rounded-xl p-3 hover:border-blue-500 transition">
                <span class="block text-sm ${item.readAt ? '' : 'font-bold'}">${escapeText(item.message)}</span>
                <span class="block text-xs text-slate-500 dark:text-slate-400 mt-1">${item.readAt ? 'Lue' : 'Non lue'} · ${escapeText(new Date(item.createdAt).toLocaleString('fr-FR'))}</span>
            </button>`).join('') || '<p class="dialog-message">Aucune notification.</p>';
    } catch (error) {
        if (version === notificationRequestVersion) document.getElementById('notificationsList').textContent = 'Impossible de charger les notifications.';
        console.error(error);
    }
}
function openNotifications() {
    document.getElementById('notificationsDialog').showModal();
    void refreshNotifications();
}
async function markAllNotificationsRead() {
    if (!currentUserId) return;
    try {
        await api('/api/notifications/read-all', { method: 'PUT' });
        await refreshNotifications();
    } catch (error) { console.error(error); }
}
async function openNotification(id) {
    const item = notificationItems.find(notification => notification._id === id);
    if (!item) return;
    const companyId = currentCompanyId;
    const userId = currentUserId;
    try {
        await api(`/api/notifications/${id}/read`, { method: 'PUT' });
        if (companyId !== currentCompanyId || userId !== currentUserId) return;
        await loadProjects();
        if (companyId !== currentCompanyId || userId !== currentUserId) return;
        const project = projects.find(candidate => candidate._id === item.projectId);
        if (!project) {
            await showError('Ce projet a été supprimé.');
            return;
        }
        document.getElementById('projectScope').value = project.archived ? 'archived' : 'active';
        await selectProject(item.projectId);
        if (companyId !== currentCompanyId || userId !== currentUserId) return;
        document.getElementById('notificationsDialog').close();
        switchView('kanban');
        if (tasks.some(task => task._id === item.taskId)) openChatModal(item.taskId);
        else await showError('Cette tâche a été supprimée.');
        await refreshNotifications();
    } catch (error) { console.error(error); }
}
