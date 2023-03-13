sap.ui.define([
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/export/Spreadsheet",
], function (MessageToast, JSONModel, Spreadsheet) {
    "use strict";

    var that = this;

    return {
        onExport: function (oEvent) {
            var oButton = oEvent.getSource();
            var tabName = oButton.data('TableName')

            console.log(oButton.getParent().getParent().getId())

            var tableName = ""
            if(oButton.getParent().getParent().getId().includes("mainTab"))
                tableName = "mainTab";
            else if(oButton.getParent().getParent().getId().includes("detailsTab"))
                tableName = "detailsTab";
            else if(oButton.getParent().getParent().getId().includes("delSchedTab"))
                tableName = "delSchedTab";
            else if(oButton.getParent().getParent().getId().includes("delInvTab"))
                tableName = "delInvTab";
            else if(oButton.getParent().getParent().getId().includes("poHistTab"))
                tableName = "poHistTab";
            else if(oButton.getParent().getParent().getId().includes("conditionsTab"))
                tableName = "conditionsTab";
            else if(oButton.getParent().getParent().getId().includes("vpoDetailsTab"))
                tableName = "vpoDetailsTab";
            else if(oButton.getParent().getParent().getId().includes("vpoDelSchedTab"))
                tableName = "vpoDelSchedTab";
            else if(oButton.getParent().getParent().getId().includes("vpoDelInvTab"))
                tableName = "vpoDelInvTab";
            else if(oButton.getParent().getParent().getId().includes("vpoPoHistTab"))
                tableName = "vpoPoHistTab";
            else if(oButton.getParent().getParent().getId().includes("vpoConditionsTab"))
                tableName = "vpoConditionsTab";

            var oTable = this.getView().byId(tableName);

            // var oExport = oTable.exportData();

            var aCols = [], aRows, oSettings, oSheet;
            var aParent, aChild;
            var fileName;

            var columns = oTable.getColumns();
            console.log(oTable.getModel())
            for (var i = 0; i < columns.length; i++) {
                aCols.push({
                    label: columns[i].mProperties.filterProperty,
                    property: columns[i].mProperties.filterProperty,
                    type: 'string'
                })
            }

            var property;

            if (tabName === 'styleDetldBOMTab') {
                property = '/results/items';
                aParent = oTable.getModel('DataModel').getProperty(property);

                aRows = [];

                for (var i = 0; i < aParent.length; i++) {
                    aRows.push(aParent[i]);
                    try {
                        for (var j = 0; j < aParent[i].items.length; j++) {
                            aChild = aParent[i].items[j];
                            aRows.push(aChild);

                            try {
                                for (var k = 0; k < aChild.items.length; k++) {
                                    aChild = aParent[i].items[j].items[k];
                                    aRows.push(aChild);
                                }
                            } catch(err) {}
                        }
                    } catch(err) {}
                }
                
            } 
            else if (tabName === "styleMatListTab" || tabName === "ioMatListTab") {
                property = '/rows';
                aRows = oTable.getModel().getProperty(property);
            }
            else {
                property = '/rows';
                aRows = oTable.getModel().getProperty(property);
            }

            var date = new Date();
            fileName = tableName + " " + date.toLocaleDateString('en-us', { year: "numeric", month: "short", day: "numeric" });

            oSettings = {
                fileName: fileName,
                workbook: { columns: aCols },
                dataSource: aRows
            };

            oSheet = new Spreadsheet(oSettings);
            oSheet.build()
                .then(function () {
                    MessageToast.show('Spreadsheet export has finished');
                })
                .finally(function () {
                    oSheet.destroy();
                });
        }

    };
});