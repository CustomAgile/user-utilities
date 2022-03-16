Ext.define("bulk-user-update-app", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    projectScopeable: false,

    layout: 'border',

    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },

    integrationHeaders : {
        name : "bulk-user-update-app"
    },

    launch: function() {

        this.setLoading();
        CA.technicalservices.userutilities.ProjectUtility.initialize(this.getContext()).then({
            success: function(isAdmin){
                if (isAdmin){
                    this._addBoxes();

                    this._addSelectorComponents();

                    this.buildGrid();
                } else {
                    this._addMessageToApp("Project Admin (or higher) privileges for the current workspace are required to run this app.");
                }
            },
            failure: this.showErrorNotification,
            scope: this
        }).always(function(){ this.setLoading(false);}, this);
    },
    _addSelectorComponents: function(){
        this.getSelectorBox().removeAll();

        var fp = this.getSelectorBox().add({
            xtype: 'fieldpickerbutton',
            modelNames: ['User'],
            context: this.getContext(),
            margin: '10 5 10 5',
            stateful: true,
            stateId: 'grid-columns'
        });
        fp.on('fieldsupdated', this.updateStoreFields, this);

        this.getSelectorBox().add({
            xtype: 'rallyinlinefilterbutton',
            modelNames: ['User'],
            context: this.getContext(),
            margin: '10 5 10 5',
            stateful: true,
            stateId: 'grid-filters-3',
            listeners: {
                inlinefilterready: this.addInlineFilterPanel,
                inlinefilterchange: this.updateGridFilters,
                scope: this
            }
        });

        this.getSelectorBox().add({
            xtype: 'listfilterbutton',
            context: this.getContext(),
            margin: '10 5 10 5',
            listeners: {
                scope: this,
                listready: this.addListFilterPanel,
                listupdated: this.updateGridFilters
            }
        });
    },
    updateStatus: function(msg){
        this.setLoading(msg);
    },
    addListFilterPanel: function(panel){
        this.getListFilterBox().add(panel);
    },
    updateStoreFields: function(fields){
        //console.log('updateStoreFields', fields)
        this.getGrid().reconfigureWithColumns(fields);
    },
    updateGridFilters: function(filter){
        this.logger.log('updateGridFilters', filter);
        this.getSelectorBox().doLayout();
        this.buildGrid();
    },
    getFilterListButton: function(){
        return this.down('listfilterbutton');
    },
    getFilters: function(){
        var items = this.getFilterListButton() && this.getFilterListButton().getItems(),
            field = this.getFilterListButton() && this.getFilterListButton().getItemField(),
            filters = null;

        if (items && items.length > 0){
            filters = _.map(items, function(i){
                return {
                    property: field,
                    value: i
                };
            });
            filters = Rally.data.wsapi.Filter.or(filters);
        }

        // var advancedFilters = this.down('rallyinlinefilterbutton').getWsapiFilter();
        var filterButton = this.down('rallyinlinefilterbutton');
        if (filterButton && filterButton.inlineFilterPanel && filterButton.getWsapiFilter()){
            if (filters){
                filters = filters.and(filterButton.getWsapiFilter());
            } else {
                filters = filterButton.getWsapiFilter();
            }
        }

        var workspacePermissionsFilter = this.down('tsworkspacepermissionsearchfield');
        this.logger.log('getFilters workspacePermissionsFilter', workspacePermissionsFilter, workspacePermissionsFilter && workspacePermissionsFilter.getFilters());
        if (workspacePermissionsFilter && workspacePermissionsFilter.getFilters()){
            if (filters){
                filters = filters.and(workspacePermissionsFilter.getFilters());
            } else {
                filters = workspacePermissionsFilter.getFilters();
            }
        }

        var projectPermissionsFilter = this.down('tsprojectpermissionsearchfield');
        this.logger.log('getFilters projectPermissionsFilter', projectPermissionsFilter, projectPermissionsFilter && projectPermissionsFilter.getFilters());
        if (projectPermissionsFilter && projectPermissionsFilter.getFilters()){
            if (filters){
                filters = filters.and(projectPermissionsFilter.getFilters());
            } else {
                filters = projectPermissionsFilter.getFilters();
            }
        }

        return filters || [];
    },
    addInlineFilterPanel: function(panel){
        this.getAdvancedFilterBox().add(panel);
    },
    buildGrid: function(){
        this.getGridBox().removeAll();

        var fields = this.down('fieldpickerbutton').getFields() || undefined;
        var grid = Ext.create('CA.technicalservices.userutilities.UserGrid',{
            columnCfgs: fields,
            storeConfig: {
                fetch: fields.concat(['Disabled','SubscriptionAdmin','WorkspacePermission']),
                filters: this.getFilters(),
                enablePostGet: true
            },
            autoScroll: true
        });
        this.getGridBox().add(grid);
    },
    _addBoxes: function(){
        this.removeAll();

        var northBox = this.add({
            xtype:'container',
            region: 'north'
        });

        northBox.add({
            xtype: 'container',
            itemId: 'selectorBox',
            layout: 'hbox'
        });
        northBox.add({
            xtype:'container',
            itemId: 'permissionsFilterBox',
            layout: 'hbox'

        });

        northBox.add({
            xtype:'container',
            itemId: 'advancedFilterBox',
            flex: 1
        });

        northBox.add({
            xtype:'container',
            itemId: 'listFilterBox',
            flex: 1
        });

        this.add({
            xtype:'container',
            itemId: 'gridBox',
            region: 'center',
            layout: 'fit'
        });
    },
    _addMessageToApp: function(message){
        this.removeAll();
        var ct = this.add({
            xtype: 'container',
            html: '<div class="no-data-container"><div class="secondary-message">' + message + '</div></div>'
        });
    },
    getGrid: function(){
        return this.down('rallygrid');
    },
    getGridBox: function(){
        return this.down('#gridBox');
    },
    getSelectorBox: function(){
        return this.down('#selectorBox');
    },
    getPermissionsFilterBox: function(){
        return this.down('#permissionsFilterBox');
    },
    getListFilterBox: function(){
        return this.down('#listFilterBox');
    },
    getAdvancedFilterBox: function(){
        return this.down('#advancedFilterBox');
    },
    showErrorNotification: function(msg){
        Rally.ui.notify.Notifier.showError({message: msg });
    },
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    }
});
