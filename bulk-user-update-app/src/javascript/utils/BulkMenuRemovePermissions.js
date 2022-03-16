Ext.define('CA.technicalservices.userutilities.bulkmenu.RemovePermissions', {
    alias: 'widget.removepermissionsbulkmenuitem',
    extend: 'Rally.ui.menu.bulk.MenuItem',

    config: {
        text: 'Remove Permissions...',

        handler: function () {
            var height = Ext.getBody().getViewSize().height,
                width = Ext.getBody().getViewSize().width;
            var dialog = Ext.create('CA.technicalservices.userutilities.dialog.RemovePermissions',{
                height: height,
                width: width *.80
            });
            dialog.alignTo(Ext.getBody(), "t-t");
            dialog.on('updated', this.removePermissions, this);
        },
        predicate: function (records) {
            var hasPermissions = CA.technicalservices.userutilities.ProjectUtility.hasAssignUserPermissions();
            return hasPermissions;

        },
        removePermissions: function(dlg, selectionCache){
            var successfulRecords = [],
                unsuccessfulRecords = [];

            var allRecords = this.records,
                eligibleUsers = [],
                ineligibleUsers = 0;

            var promises = [];



            Ext.Array.each(this.records, function(r) {
                var eligible = r.get('WorkspacePermission') !== "Workspace Admin"
                    && r.get('WorkspacePermission') !== "Subscription Admin";
                if (eligible) {
                    eligibleUsers.push(r);
                } else {
                    ineligibleUsers++;
                }
            });
            var total = eligibleUsers.length,
                idx = 0;
            Ext.Array.each(eligibleUsers, function(r){
                    var user = r.get('ObjectID');

                    Ext.Object.each(selectionCache, function(permissionKey, projects){
                        var permission = "No Access";
                        promises.push(
                            function(){
                                Rally.getApp().setLoading("Removing permissions " + idx++ + " of " + total);
                                return CA.technicalservices.userutilities.ProjectUtility.assignPermissions(user, permission,projects, true); });
                    });
            });

            Deft.Chain.sequence(promises).then({
                success: function(results){
                    var idx = 0,
                        errorMessages = [];
                    Ext.Array.each(eligibleUsers, function(user){
                        var success = false;
                        Ext.Object.each(selectionCache, function(permissionKey, projects){
                            if (results[idx] && results[idx][0].success === true){
                                success = true;
                            } else {
                                if (!Ext.Array.contains(errorMessages, results[idx][0].message)){
                                    errorMessages.push(results[idx][0].message);
                                }
                            }
                            idx++;
                        });
                        if (!success){
                            unsuccessfulRecords.push(user);
                        } else {
                            successfulRecords.push(user);
                        }
                    });

                    this.onSuccess(successfulRecords, unsuccessfulRecords,null,errorMessages,ineligibleUsers);
                    if (errorMessages.length > 0){
                        Rally.ui.notify.Notifier.showError({message: errorMessages.join(',')});
                    }
                },
                scope: this
            }).always(function(){ Rally.getApp().setLoading(false); });


        },
        onSuccess: function (successfulRecords, unsuccessfulRecords, args, errorMessage, ineligibleUsers) {

            var message = successfulRecords.length + (successfulRecords.length === 1 ? ' user has been updated successfully' : ' users have been updated successfully');

            if(successfulRecords.length === this.records.length) {
                Rally.ui.notify.Notifier.show({
                    message: message + '.'
                });
            } else {
                if (ineligibleUsers){
                    message = message + ".<br/><br/>" + ineligibleUsers + " user(s) were not updated because they were either disabled, Subscription Administrators or Workspace Administrators";
                }

                if (unsuccessfulRecords.length > 0){
                    message = message + ".<br/><br/>" + unsuccessfulRecords.length + " failed with error: <br/> " + errorMessage;
                    Rally.ui.notify.Notifier.showWarning({
                        allowHTML: true,
                        message: message
                    });
                } else {
                    Rally.ui.notify.Notifier.show({
                        allowHTML: true,
                        message: message
                    });
                }
            }

            Ext.callback(this.onActionComplete, null, [successfulRecords, unsuccessfulRecords]);
        }
    }
});
