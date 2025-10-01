// Dashboard Main JavaScript
class PreSalesDashboard {
    constructor() {
        this.leads = [];
        this.filteredLeads = [];
        this.currentPage = 1;
        this.leadsPerPage = 20;
        this.sortColumn = 'date';
        this.sortDirection = 'desc';
        this.selectedLeads = new Set();
        this.charts = {};

        this.init();
    }

    async init() {
        try {
            this.showLoading();
            await this.loadData();
            this.setupEventListeners();
            this.renderDashboard();
            this.hideLoading();
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
            this.showToast('Error loading dashboard', 'error');
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

        document.getElementById('sourceFilter').addEventListener('change', () => {
            this.filterLeads();
        });

        document.getElementById('dateFilter').addEventListener('change', () => {
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

    renderDashboard() {
        this.renderMetrics();
        this.renderCharts();
        this.renderTable();
    }

    renderMetrics() {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Total leads
        const totalLeads = this.leads.length;
        document.getElementById('totalLeads').textContent = totalLeads.toLocaleString();

        // New leads today
        const newLeadsToday = this.leads.filter(lead =>
            lead.date === todayStr
        ).length;
        document.getElementById('newLeadsToday').textContent = newLeadsToday;

        // New leads this week
        const newLeadsWeek = this.leads.filter(lead =>
            new Date(lead.date) >= weekAgo
        ).length;
        document.getElementById('newLeadsWeek').textContent = `${newLeadsWeek} this week`;

        // Conversion rate
        const convertedLeads = this.leads.filter(lead =>
            lead.status === 'Converted'
        ).length;
        const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;
        document.getElementById('conversionRate').textContent = `${conversionRate}%`;

        // Average response time (mock calculation)
        const avgResponseTime = this.calculateAverageResponseTime();
        document.getElementById('avgResponseTime').textContent = `${avgResponseTime}h`;

        // Update change indicators
        this.updateChangeIndicators();
    }

    calculateAverageResponseTime() {
        // Mock calculation - in real implementation, you'd track actual response times
        const contacted = this.leads.filter(lead =>
            lead.status === 'Contacted' || lead.status === 'Qualified' || lead.status === 'Converted'
        );

        if (contacted.length === 0) return 0;

        // Simulate response times between 2-48 hours
        const totalHours = contacted.reduce((sum, lead) => {
            const leadDate = new Date(lead.date);
            const dayOfWeek = leadDate.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            return sum + (isWeekend ? 24 : Math.random() * 12 + 2);
        }, 0);

        return Math.round(totalHours / contacted.length);
    }

    updateChangeIndicators() {
        // Mock change calculations - in real implementation, compare with previous period
        const totalChange = Math.floor(Math.random() * 20) - 10; // -10 to +10
        const conversionChange = Math.floor(Math.random() * 10) - 5; // -5 to +5

        const totalChangeEl = document.getElementById('totalLeadsChange');
        const conversionChangeEl = document.getElementById('conversionChange');

        totalChangeEl.textContent = `${totalChange > 0 ? '+' : ''}${totalChange}% vs last month`;
        totalChangeEl.className = `metric-change ${totalChange >= 0 ? 'positive' : 'negative'}`;

        conversionChangeEl.textContent = `${conversionChange > 0 ? '+' : ''}${conversionChange}% vs last month`;
        conversionChangeEl.className = `metric-change ${conversionChange >= 0 ? 'positive' : 'negative'}`;
    }

    renderCharts() {
        this.renderStatusChart();
        this.renderSourceChart();
        this.renderTrendsChart();
    }

    renderStatusChart() {
        const ctx = document.getElementById('statusChart').getContext('2d');

        // Destroy existing chart if it exists
        if (this.charts.statusChart) {
            this.charts.statusChart.destroy();
        }

        const statusCounts = this.leads.reduce((acc, lead) => {
            acc[lead.status] = (acc[lead.status] || 0) + 1;
            return acc;
        }, {});

        const data = {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    '#667eea',
                    '#764ba2',
                    '#f093fb',
                    '#f5576c',
                    '#4facfe',
                    '#00f2fe',
                    '#43e97b',
                    '#38f9d7'
                ],
                borderWidth: 0
            }]
        };

        this.charts.statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    renderSourceChart() {
        const ctx = document.getElementById('sourceChart').getContext('2d');

        if (this.charts.sourceChart) {
            this.charts.sourceChart.destroy();
        }

        const sourceCounts = this.leads.reduce((acc, lead) => {
            acc[lead.source] = (acc[lead.source] || 0) + 1;
            return acc;
        }, {});

        const data = {
            labels: Object.keys(sourceCounts),
            datasets: [{
                data: Object.values(sourceCounts),
                backgroundColor: [
                    '#667eea',
                    '#f093fb',
                    '#4facfe',
                    '#43e97b'
                ],
                borderWidth: 0
            }]
        };

        this.charts.sourceChart = new Chart(ctx, {
            type: 'pie',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    renderTrendsChart() {
        const ctx = document.getElementById('trendsChart').getContext('2d');

        if (this.charts.trendsChart) {
            this.charts.trendsChart.destroy();
        }

        // Generate daily trends for the last 30 days
        const last30Days = [];
        const leadCounts = [];
        const today = new Date();

        for (let i = 29; i >= 0; i--) {
            const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            last30Days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

            const dayLeads = this.leads.filter(lead => lead.date === dateStr).length;
            leadCounts.push(dayLeads);
        }

        const data = {
            labels: last30Days,
            datasets: [{
                label: 'New Leads',
                data: leadCounts,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        };

        this.charts.trendsChart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    renderTable() {
        const tbody = document.getElementById('leadsTableBody');
        const startIndex = (this.currentPage - 1) * this.leadsPerPage;
        const endIndex = startIndex + this.leadsPerPage;
        const pageLeads = this.filteredLeads.slice(startIndex, endIndex);

        tbody.innerHTML = pageLeads.map(lead => `
            <tr class="${this.selectedLeads.has(lead.id) ? 'selected' : ''}">
                <td>
                    <input type="checkbox"
                           class="lead-checkbox"
                           data-lead-id="${lead.id}"
                           ${this.selectedLeads.has(lead.id) ? 'checked' : ''}>
                </td>
                <td class="lead-name" data-lead-id="${lead.id}">${this.escapeHtml(lead.name)}</td>
                <td>${this.escapeHtml(lead.email)}</td>
                <td>${this.escapeHtml(lead.mobile || '-')}</td>
                <td><span class="status-badge status-${lead.status.toLowerCase()}">${lead.status}</span></td>
                <td>${lead.source}</td>
                <td>${this.formatDate(lead.date)}</td>
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
                        <button class="action-btn edit" onclick="dashboard.editLead('${lead.id}')"
                                title="Edit Lead">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

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
        const sourceFilter = document.getElementById('sourceFilter').value;
        const dateFilter = document.getElementById('dateFilter').value;

        this.filteredLeads = this.leads.filter(lead => {
            const matchesSearch = !searchTerm ||
                lead.name.toLowerCase().includes(searchTerm) ||
                lead.email.toLowerCase().includes(searchTerm) ||
                (lead.mobile && lead.mobile.includes(searchTerm));

            const matchesStatus = !statusFilter || lead.status === statusFilter;
            const matchesSource = !sourceFilter || lead.source === sourceFilter;
            const matchesDate = !dateFilter || lead.date === dateFilter;

            return matchesSearch && matchesStatus && matchesSource && matchesDate;
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
                    <option value="New" ${lead.status === 'New' ? 'selected' : ''}>New</option>
                    <option value="Contacted" ${lead.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
                    <option value="Qualified" ${lead.status === 'Qualified' ? 'selected' : ''}>Qualified</option>
                    <option value="Converted" ${lead.status === 'Converted' ? 'selected' : ''}>Converted</option>
                    <option value="Lost" ${lead.status === 'Lost' ? 'selected' : ''}>Lost</option>
                </select>
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
            notes: document.getElementById('editNotes').value
        };

        try {
            await window.LeadsAPI.updateLead(leadId, updatedData);

            // Update local data
            Object.assign(lead, updatedData);

            this.hideModal();
            this.renderDashboard();
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
            this.renderDashboard();
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

    async refreshData() {
        this.showLoading();
        try {
            await this.loadData();
            this.renderDashboard();
            this.showToast('Dashboard refreshed successfully', 'success');
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