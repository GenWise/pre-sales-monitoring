// Lead Case Management System
class PreSalesDashboard {
    constructor() {
        this.leads = [];
        this.filteredLeads = [];
        this.currentPage = 1;
        this.leadsPerPage = 25;
        this.sortColumn = 'date';
        this.sortDirection = 'desc';
        this.selectedLeads = new Set();
        this.currentUser = 'Rajesh'; // In real system, get from auth

        this.init();
    }

    async init() {
        try {
            this.showLoading();
            await this.loadData();
            this.setupEventListeners();
            this.renderCaseManagement();
            this.hideLoading();
        } catch (error) {
            console.error('Case management initialization failed:', error);
            this.showToast('Error loading case management system', 'error');
            this.hideLoading();
        }
    }

    async loadData() {
        try {
            // Ensure LeadsAPI is available
            if (!window.LeadsAPI) {
                throw new Error('LeadsAPI not initialized');
            }
            this.leads = await window.LeadsAPI.getAllLeads();
            this.filteredLeads = [...this.leads];
        } catch (error) {
            console.error('Failed to load leads data:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterLeads();
        });

        // Filter dropdowns
        document.getElementById('statusFilter').addEventListener('change', () => {
            this.filterLeads();
        });

        document.getElementById('ownerFilter').addEventListener('change', () => {
            this.filterLeads();
        });

        document.getElementById('priorityFilter').addEventListener('change', () => {
            this.filterLeads();
        });

        document.getElementById('sourceFilter').addEventListener('change', () => {
            this.filterLeads();
        });

        // Table sorting
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', (e) => {
                const column = e.currentTarget.dataset.sort;
                this.sortTable(column);
            });
        });

        // Select all checkbox
        document.getElementById('selectAll').addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });

        // Pagination
        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderTable();
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredLeads.length / this.leadsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderTable();
            }
        });

        // Bulk actions
        document.getElementById('clearSelection').addEventListener('click', () => {
            this.clearSelection();
        });

        document.getElementById('bulkCall').addEventListener('click', () => {
            this.bulkAction('call');
        });

        document.getElementById('bulkEmail').addEventListener('click', () => {
            this.bulkAction('email');
        });

        document.getElementById('bulkStatusUpdate').addEventListener('change', (e) => {
            if (e.target.value) {
                this.bulkStatusUpdate(e.target.value);
                e.target.value = '';
            }
        });

        document.getElementById('bulkOwnerUpdate').addEventListener('change', (e) => {
            if (e.target.value) {
                this.bulkOwnerUpdate(e.target.value);
                e.target.value = '';
            }
        });

        // Queue management actions
        document.getElementById('assignToMe').addEventListener('click', () => {
            this.assignSelectedToMe();
        });

        document.getElementById('markAsHot').addEventListener('click', () => {
            this.markSelectedAsHot();
        });

        document.getElementById('bulkAssign').addEventListener('change', (e) => {
            if (e.target.value) {
                this.bulkOwnerUpdate(e.target.value);
                e.target.value = '';
            }
        });

        document.getElementById('scheduleFollowup').addEventListener('click', () => {
            this.scheduleFollowupForSelected();
        });

        document.getElementById('bulkExport').addEventListener('click', () => {
            this.exportSelected();
        });

        // Modal events
        document.getElementById('modalClose').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modalCancel').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modalSave').addEventListener('click', () => {
            this.saveLeadChanges();
        });

        // Close modal on outside click
        document.getElementById('leadModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideModal();
            }
        });
    }

    renderCaseManagement() {
        this.renderQueueStats();
        this.renderTable();
    }

    renderQueueStats() {
        // Unassigned leads
        const unassigned = this.leads.filter(lead =>
            !lead.assignedOwner || lead.assignedOwner === 'Unassigned'
        ).length;
        document.getElementById('unassignedCount').textContent = unassigned;

        // My leads (assigned to current user)
        const myLeads = this.leads.filter(lead =>
            lead.assignedOwner === this.currentUser
        ).length;
        document.getElementById('myLeadsCount').textContent = myLeads;

        // Hot leads (high priority)
        const hotLeads = this.leads.filter(lead =>
            lead.interestLevel === 'High'
        ).length;
        document.getElementById('hotLeadsCount').textContent = hotLeads;

        // Overdue tasks (follow-ups past due date)
        const overdue = this.leads.filter(lead => {
            if (lead.status === 'Follow-up' && lead.followUpDate) {
                const followUpDate = new Date(lead.followUpDate);
                const today = new Date();
                return followUpDate < today;
            }
            return false;
        }).length;
        document.getElementById('overdueTasks').textContent = overdue;
    }


    renderTable() {
        const tbody = document.getElementById('leadsTableBody');
        const startIndex = (this.currentPage - 1) * this.leadsPerPage;
        const endIndex = startIndex + this.leadsPerPage;
        const pageLeads = this.filteredLeads.slice(startIndex, endIndex);

        tbody.innerHTML = pageLeads.map(lead => {
            const isOverdue = this.isLeadOverdue(lead);
            const rowClass = this.selectedLeads.has(lead.id) ? 'selected' : '';
            const urgentClass = isOverdue ? 'urgent' : '';
            const priorityClass = lead.interestLevel === 'High' ? 'high-priority' : '';

            return `
            <tr class="${rowClass} ${urgentClass} ${priorityClass}">
                <td>
                    <input type="checkbox"
                           class="lead-checkbox"
                           data-lead-id="${lead.id}"
                           ${this.selectedLeads.has(lead.id) ? 'checked' : ''}>
                </td>
                <td class="lead-name" data-lead-id="${lead.id}">
                    ${this.escapeHtml(lead.name)}
                    ${lead.interestLevel === 'High' ? '<i class="fas fa-fire" title="High Priority" style="color: #f56565; margin-left: 5px;"></i>' : ''}
                    ${isOverdue ? '<i class="fas fa-exclamation-triangle" title="Overdue" style="color: #ed8936; margin-left: 5px;"></i>' : ''}
                </td>
                <td>${this.escapeHtml(lead.email)}</td>
                <td>${this.escapeHtml(lead.mobile || '-')}</td>
                <td><span class="status-badge status-${this.getStatusClass(lead.status)}">${lead.status}</span></td>
                <td>
                    <div class="owner-cell">
                        <span class="owner-name">${lead.assignedOwner || 'Unassigned'}</span>
                        ${!lead.assignedOwner || lead.assignedOwner === 'Unassigned' ?
                            `<button class="btn-assign" onclick="dashboard.assignLead('${lead.id}', '${this.currentUser}')" title="Assign to me">
                                <i class="fas fa-user-plus"></i>
                            </button>` : ''}
                    </div>
                </td>
                <td>
                    <span class="priority-badge priority-${lead.interestLevel?.toLowerCase() || 'low'}">
                        ${lead.interestLevel || 'Low'}
                    </span>
                </td>
                <td>${this.getSourceDisplayName(lead.source)}</td>
                <td>
                    ${this.formatDate(lead.date)}
                    ${lead.followUpDate ? `<br><small style="color: #666;">Follow-up: ${this.formatDate(lead.followUpDate)}</small>` : ''}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn call" onclick="dashboard.callLead('${lead.id}')"
                                title="Call Lead">
                            <i class="fas fa-phone"></i>
                        </button>
                        <button class="action-btn email" onclick="dashboard.emailLead('${lead.id}')"
                                title="Email Lead">
                            <i class="fas fa-envelope"></i>
                        </button>
                        <button class="action-btn status" onclick="dashboard.quickStatusUpdate('${lead.id}')"
                                title="Update Status">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn followup" onclick="dashboard.scheduleFollowup('${lead.id}')"
                                title="Schedule Follow-up">
                            <i class="fas fa-calendar-plus"></i>
                        </button>
                        <button class="action-btn details" onclick="dashboard.editLead('${lead.id}')"
                                title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');

        // Add event listeners for checkboxes and lead names
        tbody.querySelectorAll('.lead-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const leadId = e.target.dataset.leadId;
                if (e.target.checked) {
                    this.selectedLeads.add(leadId);
                } else {
                    this.selectedLeads.delete(leadId);
                }
                this.updateSelectionUI();
            });
        });

        tbody.querySelectorAll('.lead-name').forEach(nameCell => {
            nameCell.addEventListener('click', (e) => {
                const leadId = e.target.dataset.leadId;
                this.showLeadDetails(leadId);
            });
            nameCell.style.cursor = 'pointer';
            nameCell.style.color = '#667eea';
        });

        this.updatePagination();
        this.updateSelectionUI();
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredLeads.length / this.leadsPerPage);
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const pageInfo = document.getElementById('pageInfo');

        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= totalPages;
        pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
    }

    filterLeads() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;
        const ownerFilter = document.getElementById('ownerFilter').value;
        const priorityFilter = document.getElementById('priorityFilter').value;
        const sourceFilter = document.getElementById('sourceFilter').value;

        this.filteredLeads = this.leads.filter(lead => {
            const matchesSearch = !searchTerm ||
                lead.name.toLowerCase().includes(searchTerm) ||
                lead.email.toLowerCase().includes(searchTerm) ||
                (lead.mobile && lead.mobile.includes(searchTerm));

            const matchesStatus = !statusFilter || lead.status === statusFilter;
            const matchesOwner = !ownerFilter || (lead.assignedOwner || 'Unassigned') === ownerFilter;
            const matchesPriority = !priorityFilter || (lead.interestLevel || 'Low') === priorityFilter;
            const matchesSource = !sourceFilter || lead.source === sourceFilter;

            return matchesSearch && matchesStatus && matchesOwner && matchesPriority && matchesSource;
        });

        this.currentPage = 1;
        this.renderTable();
    }

    sortTable(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        this.filteredLeads.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            // Handle different data types
            if (column === 'date') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            } else if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            let result = 0;
            if (aVal < bVal) result = -1;
            if (aVal > bVal) result = 1;

            return this.sortDirection === 'desc' ? -result : result;
        });

        // Update sort indicators
        document.querySelectorAll('.sortable').forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
        });

        const currentTh = document.querySelector(`[data-sort="${column}"]`);
        if (currentTh) {
            currentTh.classList.add(`sorted-${this.sortDirection}`);
        }

        this.renderTable();
    }

    toggleSelectAll(checked) {
        const startIndex = (this.currentPage - 1) * this.leadsPerPage;
        const endIndex = startIndex + this.leadsPerPage;
        const pageLeads = this.filteredLeads.slice(startIndex, endIndex);

        pageLeads.forEach(lead => {
            if (checked) {
                this.selectedLeads.add(lead.id);
            } else {
                this.selectedLeads.delete(lead.id);
            }
        });

        this.renderTable();
    }

    updateSelectionUI() {
        const selectedCount = this.selectedLeads.size;
        const actionCenter = document.getElementById('actionCenter');
        const selectedCountEl = document.getElementById('selectedCount');

        if (selectedCount > 0) {
            actionCenter.style.display = 'block';
            selectedCountEl.textContent = selectedCount;
        } else {
            actionCenter.style.display = 'none';
        }

        // Update select all checkbox
        const selectAllCheckbox = document.getElementById('selectAll');
        const startIndex = (this.currentPage - 1) * this.leadsPerPage;
        const endIndex = startIndex + this.leadsPerPage;
        const pageLeads = this.filteredLeads.slice(startIndex, endIndex);

        const pageSelectedCount = pageLeads.filter(lead =>
            this.selectedLeads.has(lead.id)
        ).length;

        selectAllCheckbox.checked = pageSelectedCount === pageLeads.length && pageLeads.length > 0;
        selectAllCheckbox.indeterminate = pageSelectedCount > 0 && pageSelectedCount < pageLeads.length;
    }

    clearSelection() {
        this.selectedLeads.clear();
        this.renderTable();
    }

    // Lead Actions
    callLead(leadId) {
        const lead = this.leads.find(l => l.id === leadId);
        if (lead && lead.mobile) {
            window.open(`tel:${lead.mobile}`);
            this.showToast(`Calling ${lead.name}`, 'info');
        } else {
            this.showToast('No phone number available', 'warning');
        }
    }

    emailLead(leadId) {
        const lead = this.leads.find(l => l.id === leadId);
        if (lead) {
            const subject = encodeURIComponent('Follow-up on your inquiry');
            const body = encodeURIComponent(`Dear ${lead.name},\n\nThank you for your interest in our services.\n\nBest regards,\nSales Team`);
            window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`);
            this.showToast(`Email opened for ${lead.name}`, 'info');
        }
    }

    editLead(leadId) {
        this.showLeadDetails(leadId);
    }

    showLeadDetails(leadId) {
        const lead = this.leads.find(l => l.id === leadId);
        if (!lead) return;

        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = `Lead Details - ${lead.name}`;
        modalBody.innerHTML = `
            <div class="form-group">
                <label for="editName">Name:</label>
                <input type="text" id="editName" value="${this.escapeHtml(lead.name)}" class="form-input">
            </div>
            <div class="form-group">
                <label for="editEmail">Email:</label>
                <input type="email" id="editEmail" value="${this.escapeHtml(lead.email)}" class="form-input">
            </div>
            <div class="form-group">
                <label for="editMobile">Mobile:</label>
                <input type="tel" id="editMobile" value="${this.escapeHtml(lead.mobile || '')}" class="form-input">
            </div>
            <div class="form-group">
                <label for="editStatus">Status:</label>
                <select id="editStatus" class="form-input">
                    <option value="New Parent" ${lead.status === 'New Parent' ? 'selected' : ''}>New Parent</option>
                    <option value="Contacted" ${lead.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
                    <option value="Follow-up" ${lead.status === 'Follow-up' ? 'selected' : ''}>Follow-up</option>
                    <option value="Enrolled" ${lead.status === 'Enrolled' ? 'selected' : ''}>Enrolled</option>
                    <option value="Not Interested" ${lead.status === 'Not Interested' ? 'selected' : ''}>Not Interested</option>
                </select>
            </div>
            <div class="form-group">
                <label for="editOwner">Assigned Owner:</label>
                <select id="editOwner" class="form-input">
                    <option value="Unassigned" ${(lead.assignedOwner || 'Unassigned') === 'Unassigned' ? 'selected' : ''}>Unassigned</option>
                    <option value="Rajesh" ${lead.assignedOwner === 'Rajesh' ? 'selected' : ''}>Rajesh</option>
                    <option value="Team Member" ${lead.assignedOwner === 'Team Member' ? 'selected' : ''}>Team Member</option>
                </select>
            </div>
            <div class="form-group">
                <label for="editPriority">Priority Level:</label>
                <select id="editPriority" class="form-input">
                    <option value="Low" ${(lead.interestLevel || 'Low') === 'Low' ? 'selected' : ''}>Low</option>
                    <option value="Medium" ${lead.interestLevel === 'Medium' ? 'selected' : ''}>Medium</option>
                    <option value="High" ${lead.interestLevel === 'High' ? 'selected' : ''}>High</option>
                </select>
            </div>
            <div class="form-group">
                <label for="editFollowUp">Follow-up Date:</label>
                <input type="date" id="editFollowUp" value="${lead.followUpDate || ''}" class="form-input">
            </div>
            <div class="form-group">
                <label for="editSource">Source:</label>
                <input type="text" id="editSource" value="${lead.source}" class="form-input" readonly>
            </div>
            <div class="form-group">
                <label for="editNotes">Notes:</label>
                <textarea id="editNotes" rows="4" class="form-input" placeholder="Add notes about this lead...">${this.escapeHtml(lead.notes || '')}</textarea>
            </div>
            <div class="form-group">
                <label>Lead Created:</label>
                <p class="form-text">${this.formatDate(lead.date)} at ${this.formatTime(lead.timestamp || lead.date)}</p>
            </div>
        `;

        // Store the lead ID for saving
        document.getElementById('modalSave').dataset.leadId = leadId;

        this.showModal();
    }

    async saveLeadChanges() {
        const leadId = document.getElementById('modalSave').dataset.leadId;
        const lead = this.leads.find(l => l.id === leadId);

        if (!lead) return;

        const updatedData = {
            name: document.getElementById('editName').value,
            email: document.getElementById('editEmail').value,
            mobile: document.getElementById('editMobile').value,
            status: document.getElementById('editStatus').value,
            assignedOwner: document.getElementById('editOwner').value,
            interestLevel: document.getElementById('editPriority').value,
            followUpDate: document.getElementById('editFollowUp').value || null,
            notes: document.getElementById('editNotes').value
        };

        try {
            await window.LeadsAPI.updateLead(leadId, updatedData);

            // Update local data
            Object.assign(lead, updatedData);

            this.hideModal();
            this.renderCaseManagement();
            this.showToast('Lead updated successfully', 'success');
        } catch (error) {
            console.error('Failed to update lead:', error);
            this.showToast('Failed to update lead', 'error');
        }
    }

    // Bulk Actions
    bulkAction(action) {
        const selectedLeadsData = this.leads.filter(lead =>
            this.selectedLeads.has(lead.id)
        );

        if (selectedLeadsData.length === 0) {
            this.showToast('No leads selected', 'warning');
            return;
        }

        switch (action) {
            case 'call':
                this.bulkCall(selectedLeadsData);
                break;
            case 'email':
                this.bulkEmail(selectedLeadsData);
                break;
        }
    }

    bulkCall(leads) {
        const phoneCalls = leads
            .filter(lead => lead.mobile)
            .map(lead => `${lead.name}: ${lead.mobile}`)
            .join('\n');

        if (phoneCalls) {
            this.showToast(`Phone numbers for ${leads.length} leads:\n${phoneCalls}`, 'info');
        } else {
            this.showToast('No phone numbers available for selected leads', 'warning');
        }
    }

    bulkEmail(leads) {
        const emails = leads.map(lead => lead.email).join(',');
        const subject = encodeURIComponent('Follow-up on your inquiry');
        const body = encodeURIComponent('Dear valued leads,\n\nThank you for your interest in our services.\n\nBest regards,\nSales Team');

        window.open(`mailto:${emails}?subject=${subject}&body=${body}`);
        this.showToast(`Email opened for ${leads.length} leads`, 'info');
    }

    async bulkStatusUpdate(newStatus) {
        const selectedIds = Array.from(this.selectedLeads);

        if (selectedIds.length === 0) {
            this.showToast('No leads selected', 'warning');
            return;
        }

        try {
            await Promise.all(
                selectedIds.map(id => window.LeadsAPI.updateLead(id, { status: newStatus }))
            );

            // Update local data
            this.leads.forEach(lead => {
                if (selectedIds.includes(lead.id)) {
                    lead.status = newStatus;
                }
            });

            this.clearSelection();
            this.renderCaseManagement();
            this.showToast(`Updated ${selectedIds.length} leads to ${newStatus}`, 'success');
        } catch (error) {
            console.error('Bulk update failed:', error);
            this.showToast('Failed to update leads', 'error');
        }
    }

    // Export Functions
    exportData() {
        this.exportToCSV(this.leads, 'all_leads.csv');
    }

    exportSelected() {
        const selectedLeadsData = this.leads.filter(lead =>
            this.selectedLeads.has(lead.id)
        );

        if (selectedLeadsData.length === 0) {
            this.showToast('No leads selected', 'warning');
            return;
        }

        this.exportToCSV(selectedLeadsData, 'selected_leads.csv');
    }

    exportToCSV(data, filename) {
        const headers = ['Name', 'Email', 'Mobile', 'Status', 'Source', 'Date', 'Notes'];
        const csvContent = [
            headers.join(','),
            ...data.map(lead => [
                `"${lead.name}"`,
                `"${lead.email}"`,
                `"${lead.mobile || ''}"`,
                `"${lead.status}"`,
                `"${lead.source}"`,
                `"${lead.date}"`,
                `"${lead.notes || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showToast(`Exported ${data.length} leads to ${filename}`, 'success');
    }

    // Utility Functions
    showLoading() {
        document.getElementById('loadingOverlay').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }

    showModal() {
        document.getElementById('leadModal').classList.add('show');
    }

    hideModal() {
        document.getElementById('leadModal').classList.remove('show');
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-times-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${iconMap[type]}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });

        toastContainer.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Case Management Helper Methods
    isLeadOverdue(lead) {
        if (lead.status === 'Follow-up' && lead.followUpDate) {
            const followUpDate = new Date(lead.followUpDate);
            const today = new Date();
            return followUpDate < today;
        }
        return false;
    }

    getStatusClass(status) {
        const statusMap = {
            'New Parent': 'new',
            'Contacted': 'contacted',
            'Follow-up': 'followup',
            'Enrolled': 'enrolled',
            'Not Interested': 'notinterested'
        };
        return statusMap[status] || status.toLowerCase().replace(/\s+/g, '');
    }

    getSourceDisplayName(source) {
        const sourceMap = {
            'returning_students': 'Returning Students',
            'ats_qualifiers': 'ATS Qualifiers',
            'website': 'Website',
            'early_bird': 'Early Bird'
        };
        return sourceMap[source] || source;
    }

    // Case Management Actions
    async assignLead(leadId, owner) {
        try {
            await window.LeadsAPI.updateLead(leadId, { assignedOwner: owner });

            // Update local data
            const lead = this.leads.find(l => l.id === leadId);
            if (lead) {
                lead.assignedOwner = owner;
            }

            this.renderCaseManagement();
            this.showToast(`Lead assigned to ${owner}`, 'success');
        } catch (error) {
            console.error('Failed to assign lead:', error);
            this.showToast('Failed to assign lead', 'error');
        }
    }

    async assignSelectedToMe() {
        const selectedIds = Array.from(this.selectedLeads);
        if (selectedIds.length === 0) {
            this.showToast('No leads selected', 'warning');
            return;
        }

        try {
            await Promise.all(
                selectedIds.map(id => window.LeadsAPI.updateLead(id, { assignedOwner: this.currentUser }))
            );

            // Update local data
            this.leads.forEach(lead => {
                if (selectedIds.includes(lead.id)) {
                    lead.assignedOwner = this.currentUser;
                }
            });

            this.clearSelection();
            this.renderCaseManagement();
            this.showToast(`Assigned ${selectedIds.length} leads to you`, 'success');
        } catch (error) {
            console.error('Bulk assignment failed:', error);
            this.showToast('Failed to assign leads', 'error');
        }
    }

    async markSelectedAsHot() {
        const selectedIds = Array.from(this.selectedLeads);
        if (selectedIds.length === 0) {
            this.showToast('No leads selected', 'warning');
            return;
        }

        try {
            await Promise.all(
                selectedIds.map(id => window.LeadsAPI.updateLead(id, { interestLevel: 'High' }))
            );

            // Update local data
            this.leads.forEach(lead => {
                if (selectedIds.includes(lead.id)) {
                    lead.interestLevel = 'High';
                }
            });

            this.clearSelection();
            this.renderCaseManagement();
            this.showToast(`Marked ${selectedIds.length} leads as high priority`, 'success');
        } catch (error) {
            console.error('Failed to update priority:', error);
            this.showToast('Failed to update priority', 'error');
        }
    }

    async bulkOwnerUpdate(newOwner) {
        const selectedIds = Array.from(this.selectedLeads);
        if (selectedIds.length === 0) {
            this.showToast('No leads selected', 'warning');
            return;
        }

        try {
            await Promise.all(
                selectedIds.map(id => window.LeadsAPI.updateLead(id, { assignedOwner: newOwner }))
            );

            // Update local data
            this.leads.forEach(lead => {
                if (selectedIds.includes(lead.id)) {
                    lead.assignedOwner = newOwner;
                }
            });

            this.clearSelection();
            this.renderCaseManagement();
            this.showToast(`Assigned ${selectedIds.length} leads to ${newOwner}`, 'success');
        } catch (error) {
            console.error('Bulk assignment failed:', error);
            this.showToast('Failed to assign leads', 'error');
        }
    }

    quickStatusUpdate(leadId) {
        const lead = this.leads.find(l => l.id === leadId);
        if (!lead) return;

        const statusOptions = [
            'New Parent',
            'Contacted',
            'Follow-up',
            'Enrolled',
            'Not Interested'
        ];

        const currentIndex = statusOptions.indexOf(lead.status);
        const nextStatus = statusOptions[(currentIndex + 1) % statusOptions.length];

        this.updateLeadStatus(leadId, nextStatus);
    }

    async updateLeadStatus(leadId, newStatus) {
        try {
            await window.LeadsAPI.updateLead(leadId, { status: newStatus });

            // Update local data
            const lead = this.leads.find(l => l.id === leadId);
            if (lead) {
                lead.status = newStatus;
            }

            this.renderCaseManagement();
            this.showToast(`Status updated to ${newStatus}`, 'success');
        } catch (error) {
            console.error('Failed to update status:', error);
            this.showToast('Failed to update status', 'error');
        }
    }

    scheduleFollowup(leadId) {
        const lead = this.leads.find(l => l.id === leadId);
        if (!lead) return;

        const followUpDate = prompt('Enter follow-up date (YYYY-MM-DD):');
        if (followUpDate && this.isValidDate(followUpDate)) {
            this.setFollowUpDate(leadId, followUpDate);
        } else if (followUpDate) {
            this.showToast('Invalid date format. Please use YYYY-MM-DD', 'error');
        }
    }

    scheduleFollowupForSelected() {
        const selectedIds = Array.from(this.selectedLeads);
        if (selectedIds.length === 0) {
            this.showToast('No leads selected', 'warning');
            return;
        }

        const followUpDate = prompt('Enter follow-up date for selected leads (YYYY-MM-DD):');
        if (followUpDate && this.isValidDate(followUpDate)) {
            this.bulkSetFollowUpDate(selectedIds, followUpDate);
        } else if (followUpDate) {
            this.showToast('Invalid date format. Please use YYYY-MM-DD', 'error');
        }
    }

    async setFollowUpDate(leadId, followUpDate) {
        try {
            await window.LeadsAPI.updateLead(leadId, {
                followUpDate: followUpDate,
                status: 'Follow-up'
            });

            // Update local data
            const lead = this.leads.find(l => l.id === leadId);
            if (lead) {
                lead.followUpDate = followUpDate;
                lead.status = 'Follow-up';
            }

            this.renderCaseManagement();
            this.showToast(`Follow-up scheduled for ${followUpDate}`, 'success');
        } catch (error) {
            console.error('Failed to schedule follow-up:', error);
            this.showToast('Failed to schedule follow-up', 'error');
        }
    }

    async bulkSetFollowUpDate(leadIds, followUpDate) {
        try {
            await Promise.all(
                leadIds.map(id => window.LeadsAPI.updateLead(id, {
                    followUpDate: followUpDate,
                    status: 'Follow-up'
                }))
            );

            // Update local data
            this.leads.forEach(lead => {
                if (leadIds.includes(lead.id)) {
                    lead.followUpDate = followUpDate;
                    lead.status = 'Follow-up';
                }
            });

            this.clearSelection();
            this.renderCaseManagement();
            this.showToast(`Follow-up scheduled for ${leadIds.length} leads`, 'success');
        } catch (error) {
            console.error('Bulk follow-up scheduling failed:', error);
            this.showToast('Failed to schedule follow-ups', 'error');
        }
    }

    isValidDate(dateString) {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;

        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    async refreshData() {
        this.showLoading();
        try {
            await this.loadData();
            this.renderCaseManagement();
            this.showToast('Case management system refreshed successfully', 'success');
        } catch (error) {
            console.error('Failed to refresh data:', error);
            this.showToast('Failed to refresh data', 'error');
        } finally {
            this.hideLoading();
        }
    }
}

// Add form styles
const formStyles = `
    .form-group {
        margin-bottom: 1.5rem;
    }

    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #333;
    }

    .form-input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 0.875rem;
        transition: border-color 0.3s ease;
    }

    .form-input:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-text {
        color: #666;
        font-size: 0.875rem;
        margin: 0;
    }
`;

// Add form styles to head
const styleSheet = document.createElement('style');
styleSheet.textContent = formStyles;
document.head.appendChild(styleSheet);

// Initialize dashboard when DOM is loaded and LeadsAPI is ready
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    // Wait for LeadsAPI to be available
    function initDashboard() {
        if (window.LeadsAPI) {
            dashboard = new PreSalesDashboard();
        } else {
            // Retry after a short delay if LeadsAPI is not ready
            setTimeout(initDashboard, 100);
        }
    }
    initDashboard();
});