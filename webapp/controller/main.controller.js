sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, Common, MessageBox) {
        "use strict";

        var that;
        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
        var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });

        return Controller.extend("zuivendorpo.controller.main", {
            onInit: function () {
                that = this;
                this._oModel = this.getOwnerComponent().getModel();
                this.showLoadingDialog('Loading...');
                this._counts = {
                    unreleasedpo: 0,
                    openlineitems: 0,
                }

                this.getView().setModel(new JSONModel({
                    sbu: '',
                    activePONo:'',
                    activeCondRec:'',
                }), "ui");

                var oDelegateKeyUp = {
                    onkeyup: function(oEvent){
                        that.onKeyUp(oEvent);
                    }
                };
                this.byId("mainTab").addEventDelegate(oDelegateKeyUp);


                this._sbuChange = false;
                var oJSONDataModel = new JSONModel(); 
                oJSONDataModel.setData(this._counts);
                this.getView().setModel(oJSONDataModel, "counts");
                
                this.setSmartFilterModel();

                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_VPO_FILTERS_CDS");
                oModel.read("/ZVB_3DERP_SBU_SH", {
                    success: function (oData, oResponse) {
                        // console.log(oData)
                        if (oData.results.length === 1) {
                            that.getView().getModel("ui").setProperty("/sbu", oData.results[0].SBU);
                            that.getColumns("AUTO_INIT");
                        }
                        else {
                            that.closeLoadingDialog();
                        }
                    },
                    error: function (err) { }
                });

                this._aEntitySet = {
                    main: "mainSet"
                };

                this._aColumns = {};

                this.getCols();
                this.getMain();

                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
            },
            setSmartFilterModel: function () {
                //Model StyleHeaderFilters is for the smartfilterbar
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_VPO_FILTERS_CDS");
                var oSmartFilter = this.getView().byId("smartFilterBar");
                oSmartFilter.setModel(oModel);
            },
            getColumns(arg,type,tabname,tableTab) {
                var me = this;
                //get dynamic columns based on saved layout or ZERP_CHECK
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                var vSBU = this.getView().getModel("ui").getData().sbu;
                // console.log(oModel)

                oModel.setHeaders({
                    sbu: vSBU,
                    type: type,
                    tabname: tabname
                });

                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        console.log(oData);
                        var oJSONColumnsModel = new JSONModel();
                        oJSONColumnsModel.setData(oData);
                        me.getView().byId(tableTab).setModel(oJSONColumnsModel, "columns"); //set the view model
                        if (oData.results.length > 0) {
                            if (arg === "AUTO_INIT") {
                                //me.getInitTableData();
                            }
                            else {
                                switch(tableTab){
                                    case 'mainTab': me.getTableData(); break;
                                    //case 'detailsTab': me.getPODetails(); break;
                                    case 'delSchedTab': me.getDelSchedule(); break;
                                    case 'delInvTab': me.getDelInvoice(); break;
                                    case 'poHistTab': me.getPOHistory(); break;
                                    case 'conditionsTab': me.getConditions(); break;
                                }
                            }
                        }
                        else {
                            //me.closeLoadingDialog();
                            sap.m.MessageBox.information("No table layout retrieve.");
                            //console.log(me.byId("mainTab"))
                            /*if (me.byId("mainTab").getColumns().length > 0) {
                                me.byId("mainTab").removeAllColumns();
                                me._counts.total = 0;
                                me._counts.unassigned = 0;
                                me._counts.partial = 0;
                                me.getView().getModel("counts").setData(me._counts);
                            }*/
                        }
                    },
                    error: function (err) {
                        //Common.closeLoadingDialog(that);
                    }
                });
            },
            getMain(){
                var oModel = this.getOwnerComponent().getModel();
                var _this = this;

                var vSBU = this.getView().getModel("ui").getData().sbu;

                oModel.read('/mainSet', { 
                    success: function (data, response) {
                        if (data.results.length > 0) {
                            data.results.forEach(item => {
                                item.PODT = dateFormat.format(item.PODT);
                            })
                            
                            /*data.results.sort((a,b) => (a.GMC > b.GMC ? 1 : -1));*/
                            
                            var oJSONModel = new sap.ui.model.json.JSONModel();
                            oJSONModel.setData(data);
                            _this.getView().getModel("ui").setProperty("/activePONo", data.results[0].PONO);
                            _this.getView().getModel("ui").setProperty("/activeCondRec", data.results[0].CONDREC);
                            _this.getPODetails2(data.results[0].PONO);
                            _this.getDelSchedule2(data.results[0].PONO);
                            _this.getDelInvoice2(data.results[0].PONO);
                            _this.getPOHistory2(data.results[0].PONO);
                            _this.getConditions2(data.results[0].CONDREC);
                        }
                        else {
                            _this.getView().getModel("ui").setProperty("/activePONo", '');
                            _this.getView().getModel("ui").setProperty("/activeCondRec", '');

                            _this.getView().setModel(new JSONModel({
                                results: []
                            }), "materials");

                            _this.getView().setModel(new JSONModel({
                                results: []
                            }), "VPODtls");

                            _this.getView().setModel(new JSONModel({
                                results: []
                            }), "VPODelSched");

                            _this.getView().setModel(new JSONModel({
                                results: []
                            }), "VPODelInv");

                            _this.getView().setModel(new JSONModel({
                                results: []
                            }), "VPOPOHist");

                            _this.getView().setModel(new JSONModel({
                                results: []
                            }), "VPOCond");
                        }

                        _this.getView().setModel(oJSONModel, "VPOHdr");
                        // console.log(_this.byId('gmcTab').getModel())
                        _this.closeLoadingDialog();
                    },
                    error: function (err) { }
                })
            },
            getTableData() {
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var aFilters = this.getView().byId("smartFilterBar").getFilters();
                var oJSONDataModel = new JSONModel();                                
                var vSBU = this.getView().byId("cboxSBU").getSelectedKey();

                if (aFilters.length > 0) {
                    aFilters[0].aFilters.forEach(item => {
                        console.log(item)
                        if (item.sPath === 'VENDOR') {
                            if (!isNaN(item.oValue1)) {
                                while (item.oValue1.length < 10) item.oValue1 = "0" + item.oValue1;
                            }
                        }
                    })
                }
                
                oModel.read("/mainSet", { 
                    filters: aFilters,
                    success: function (oData, oResponse) {

                        if (oData.results.length > 0) {
                            alert("oData>0");
                            console.log(oData);
                            oData.results.forEach(item => {
                                item.PODT = dateFormat.format(item.PODT);
                            })

                            me.getView().getModel("ui").setProperty("/activePONo", oData.results[0].PONO);
                            
                            oJSONDataModel.setData(oData);
                            me.getView().byId("mainTab").setModel(oJSONDataModel, "mainData");
                            
                        }
                        me.closeLoadingDialog();
                    },
                    error: function (err) { 
                        console.log(err)
                        me.closeLoadingDialog();
                    }
                });
                
            },
            getPOHistory2(PONO){
                var oModel = this.getOwnerComponent().getModel();
                var _this = this;
                var vSBU = this.getView().getModel("ui").getData().sbu;
                oModel.read('/VPOHistSet', { 
                    urlParameters: {
                        "$filter": "PONO eq '" + PONO + "'"
                    },
                    success: function (data, response) {
                        if (data.results.length > 0) {
                            data.results.forEach(item => {
                                item.POSTDT = dateFormat.format(item.POSTDT);
                            })
                            var oJSONModel = new sap.ui.model.json.JSONModel();
                            oJSONModel.setData(data);
                        }
                        _this.getView().setModel(oJSONModel, "VPOPOHist");
                        _this.closeLoadingDialog();
                    },
                    error: function (err) { }
                })
            },
            getDelInvoice2(PONO){
                var oModel = this.getOwnerComponent().getModel();
                var _this = this;
                var vSBU = this.getView().getModel("ui").getData().sbu;
                oModel.read('/VPODelInvSet', { 
                    urlParameters: {
                        "$filter": "PONO eq '" + PONO + "'"
                    },
                    success: function (data, response) {
                        if (data.results.length > 0) {
                            var oJSONModel = new sap.ui.model.json.JSONModel();
                            oJSONModel.setData(data);
                        }
                        _this.getView().setModel(oJSONModel, "VPODelInv");
                        _this.closeLoadingDialog();
                    },
                    error: function (err) { }
                })
            },
            getConditions2(CONDREC){
                var oModel = this.getOwnerComponent().getModel();
                var _this = this;
                var vSBU = this.getView().getModel("ui").getData().sbu;
                oModel.read('/VPOConditionsSet', { 
                    urlParameters: {
                        "$filter": "KNUMV eq '" + CONDREC + "'"
                    },
                    success: function (data, response) {
                        if (data.results.length > 0) {
                            var oJSONModel = new sap.ui.model.json.JSONModel();
                            oJSONModel.setData(data);
                        }
                        _this.getView().setModel(oJSONModel, "VPOCond");
                        _this.closeLoadingDialog();
                    },
                    error: function (err) { }
                })
            },
            getDelSchedule2(PONO){
                var oModel = this.getOwnerComponent().getModel();
                var _this = this;
                var vSBU = this.getView().getModel("ui").getData().sbu;
                oModel.read('/VPODelSchedSet', { 
                    urlParameters: {
                        "$filter": "PONO eq '" + PONO + "'"
                    },
                    success: function (data, response) {
                        if (data.results.length > 0) {
                            console.log(data);
                            var oJSONModel = new sap.ui.model.json.JSONModel();
                            oJSONModel.setData(data);
                        }
                        _this.getView().setModel(oJSONModel, "VPODelSched");
                        _this.closeLoadingDialog();
                    },
                    error: function (err) { }
                })
            },
            getPODetails2(PONO){
                var oModel = this.getOwnerComponent().getModel();
                var _this = this;
                var vSBU = this.getView().getModel("ui").getData().sbu;
                oModel.read('/VPODetailsSet', { 
                    urlParameters: {
                        "$filter": "PONO eq '" + PONO + "'"
                    },
                    success: function (data, response) {
                        if (data.results.length > 0) {
                            var oJSONModel = new sap.ui.model.json.JSONModel();
                            oJSONModel.setData(data);
                        }
                        _this.getView().setModel(oJSONModel, "VPODtls");
                        _this.closeLoadingDialog();
                    },
                    error: function (err) { }
                })
            },
            getPODetails(PONO){
                console.log("getDetails");
                //var PONO = this.getView().getModel("ui").getData().activePONo;
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONDataModel = new JSONModel();                                
                oModel.read("/VPODetailsSet", { 
                    urlParameters: {
                        "$filter": "PONO eq '" + PONO + "'"
                    },
                    success: function (oData, oResponse) {
                        console.log("console PO Details");
                        //var vUnassigned = 0, vPartial = 0;
                        console.log(oData)
                        //oData.results.forEach(item => {
                            /*if (item.VENDOR === '') vUnassigned++;
                            if (item.QTY !== item.ORDERQTY) vPartial++;*/
                          //  item.PODT = dateFormat.format(item.PODT);
                        //})

                        /*me._counts.total = oData.results.length;
                        me._counts.unassigned = vUnassigned;
                        me._counts.partial = vPartial;
                        me.getView().getModel("counts").setData(me._counts);*/

                        oJSONDataModel.setData(oData);
                        me.getView().byId("detailsTab").setModel(oJSONDataModel, "detailsData");
                        me.closeLoadingDialog();
                        me.setTableData('detailsData','detailsTab');

                        if (me.byId('detailsTab').getColumns().length === 0) {
                            console.log ("settablecolumns")
                            me.setTableColumns("detailsTab");
                        }
                        
                        // me.setChangeStatus(false);

                        /*me.byId("searchFieldMain").setEnabled(true);
                        me.byId("btnAssign").setEnabled(true);
                        me.byId("btnAssign").setEnabled(true);
                        me.byId("btnUnassign").setEnabled(true);
                        me.byId("btnCreatePO").setEnabled(true);
                        me.byId("btnTabLayout").setEnabled(true);*/
                    },
                    error: function (err) { 
                        console.log(err)
                        me.closeLoadingDialog();
                    }
                });
            },
            getDelSchedule(){
                //alert("get del sched");
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONDataModel = new JSONModel();                                
                oModel.read("/VPODelSchedSet", { 
                    urlParameters: {
                        "$filter": "PONO eq '4500000007'"
                    },
                    success: function (oData, oResponse) {
                        console.log("console Del Sched");
                        //var vUnassigned = 0, vPartial = 0;
                        console.log(oData)
                        //oData.results.forEach(item => {
                            /*if (item.VENDOR === '') vUnassigned++;
                            if (item.QTY !== item.ORDERQTY) vPartial++;*/
                          //  item.PODT = dateFormat.format(item.PODT);
                        //})

                        /*me._counts.total = oData.results.length;
                        me._counts.unassigned = vUnassigned;
                        me._counts.partial = vPartial;
                        me.getView().getModel("counts").setData(me._counts);*/

                        oJSONDataModel.setData(oData);
                        me.getView().byId("delSchedTab").setModel(oJSONDataModel, "delSchedData");
                        me.closeLoadingDialog();
                        me.setTableData('delSchedData','delSchedTab');

                        if (me.byId('delSchedTab').getColumns().length === 0) {
                            console.log ("settablecolumns")
                            me.setTableColumns("delSchedTab");
                        }
                        
                        // me.setChangeStatus(false);

                        /*me.byId("searchFieldMain").setEnabled(true);
                        me.byId("btnAssign").setEnabled(true);
                        me.byId("btnAssign").setEnabled(true);
                        me.byId("btnUnassign").setEnabled(true);
                        me.byId("btnCreatePO").setEnabled(true);
                        me.byId("btnTabLayout").setEnabled(true);*/
                    },
                    error: function (err) { 
                        console.log(err)
                        me.closeLoadingDialog();
                    }
                });
            },
            getDelInvoice(){
                //alert("get del sched");
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONDataModel = new JSONModel();                                
                oModel.read("/VPODelInvSet", { 
                    urlParameters: {
                        "$filter": "PONO eq '4500000007'"
                    },
                    success: function (oData, oResponse) {
                        console.log("console Del Inv");
                        //var vUnassigned = 0, vPartial = 0;
                        console.log(oData)
                        //oData.results.forEach(item => {
                            /*if (item.VENDOR === '') vUnassigned++;
                            if (item.QTY !== item.ORDERQTY) vPartial++;*/
                          //  item.PODT = dateFormat.format(item.PODT);
                        //})

                        /*me._counts.total = oData.results.length;
                        me._counts.unassigned = vUnassigned;
                        me._counts.partial = vPartial;
                        me.getView().getModel("counts").setData(me._counts);*/

                        oJSONDataModel.setData(oData);
                        me.getView().byId("delInvTab").setModel(oJSONDataModel, "delInvData");
                        me.closeLoadingDialog();
                        me.setTableData('delInvData','delInvTab');

                        if (me.byId('delInvTab').getColumns().length === 0) {
                            console.log ("settablecolumns")
                            me.setTableColumns("delInvTab");
                        }
                        
                        // me.setChangeStatus(false);

                        /*me.byId("searchFieldMain").setEnabled(true);
                        me.byId("btnAssign").setEnabled(true);
                        me.byId("btnAssign").setEnabled(true);
                        me.byId("btnUnassign").setEnabled(true);
                        me.byId("btnCreatePO").setEnabled(true);
                        me.byId("btnTabLayout").setEnabled(true);*/
                    },
                    error: function (err) { 
                        console.log(err)
                        me.closeLoadingDialog();
                    }
                });
            },
            getPOHistory(){
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONDataModel = new JSONModel();                                
                oModel.read("/VPOHistSet", { 
                    urlParameters: {
                        "$filter": "PONO eq '4500000007'"
                    },
                    success: function (oData, oResponse) {
                        console.log("console Hist");
                        //var vUnassigned = 0, vPartial = 0;
                        console.log(oData)
                        oData.results.forEach(item => {
                            /*if (item.VENDOR === '') vUnassigned++;
                            if (item.QTY !== item.ORDERQTY) vPartial++;*/
                           item.POSTDT = dateFormat.format(item.POSTDT);
                        })

                        /*me._counts.total = oData.results.length;
                        me._counts.unassigned = vUnassigned;
                        me._counts.partial = vPartial;
                        me.getView().getModel("counts").setData(me._counts);*/

                        oJSONDataModel.setData(oData);
                        me.getView().byId("poHistTab").setModel(oJSONDataModel, "poHistData");
                        me.closeLoadingDialog();
                        me.setTableData('poHistData','poHistTab');

                        if (me.byId('poHistTab').getColumns().length === 0) {
                            console.log ("settablecolumns")
                            me.setTableColumns("poHistTab");
                        }
                        
                        // me.setChangeStatus(false);

                        /*me.byId("searchFieldMain").setEnabled(true);
                        me.byId("btnAssign").setEnabled(true);
                        me.byId("btnAssign").setEnabled(true);
                        me.byId("btnUnassign").setEnabled(true);
                        me.byId("btnCreatePO").setEnabled(true);
                        me.byId("btnTabLayout").setEnabled(true);*/
                    },
                    error: function (err) { 
                        console.log(err)
                        me.closeLoadingDialog();
                    }
                });
            },
            getConditions(){
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONDataModel = new JSONModel();                                
                oModel.read("/VPOConditionsSet", { 
                    urlParameters: {
                        "$filter": "KNUMV eq '1000000000'"
                    },
                    success: function (oData, oResponse) {
                        console.log("console conditions");
                        //var vUnassigned = 0, vPartial = 0;
                        console.log(oData)
                        oJSONDataModel.setData(oData);
                        me.getView().byId("conditionsTab").setModel(oJSONDataModel, "conditionsData");
                        me.closeLoadingDialog();
                        me.setTableData('conditionsData','conditionsTab');

                        if (me.byId('conditionsTab').getColumns().length === 0) {
                            console.log ("settablecolumns")
                            me.setTableColumns("conditionsTab");
                        }
                        
                        // me.setChangeStatus(false);

                        /*me.byId("searchFieldMain").setEnabled(true);
                        me.byId("btnAssign").setEnabled(true);
                        me.byId("btnAssign").setEnabled(true);
                        me.byId("btnUnassign").setEnabled(true);
                        me.byId("btnCreatePO").setEnabled(true);
                        me.byId("btnTabLayout").setEnabled(true);*/
                    },
                    error: function (err) { 
                        console.log(err)
                        me.closeLoadingDialog();
                    }
                });
            },
            setTableData: function (dataModel,tableTab) {
                var me = this;

                //the selected dynamic columns
                var oColumnsModel = this.getView().byId(tableTab).getModel("columns");
                var oDataModel = this.getView().byId(tableTab).getModel(dataModel);

                //the selected styles data
                var oColumnsData = oColumnsModel.getProperty('/results');
                var oData = oDataModel.getProperty('/results');
                // console.log(oDataModel)
                //set the column and data model
                var oModel = new JSONModel();

                oModel.setData({
                    columns: oColumnsData,
                    rows: oData
                });

                var oTable = this.getView().byId(tableTab);
                oTable.setModel(oModel);

                //bind the data to the table
                oTable.bindRows("/rows");
            },
            setTableColumns(arg) {
                var me = this;
                var oTable = this.getView().byId(arg);

                //bind the dynamic column to the table
                oTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = arg + "-" +context.getObject().ColumnName;
                    var sColumnLabel = context.getObject().ColumnLabel;
                    var sColumnType = context.getObject().ColumnType;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    // var sColumnToolTip = context.getObject().Tooltip;
                    //alert(sColumnId.);

                    if (sColumnWidth === 0) sColumnWidth = 7;

                    return new sap.ui.table.Column({
                        id: sColumnId,
                        label: sColumnLabel,
                        template: me.columnTemplate(sColumnId, sColumnType),
                        width: sColumnWidth + 'rem',
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                    });
                });
            },
            setSmartFilterModel: function () {
                //Model StyleHeaderFilters is for the smartfilterbar
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_VPO_FILTERS_CDS");
                // console.log(oModel)
                var oSmartFilter = this.getView().byId("smartFilterBar");
                oSmartFilter.setModel(oModel);
            },
            columnTemplate: function (sColumnId, sColumnType) {
                var oColumnTemplate;

                oColumnTemplate = new sap.m.Text({ text: "{" + sColumnId.substring(sColumnId.indexOf("-")+1) + "}" }); //default text

                return oColumnTemplate;
            },

            getColumnSize: function (sColumnId, sColumnType) {
                //column width of fields
                var mSize = '7rem';
                return mSize;
            },
            getCols: async function() {
                var sPath = jQuery.sap.getModulePath("zuivendorpo", "/model/columns.json");
                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();
                var oModel = this.getOwnerComponent().getModel();
                console.log(oColumns);
                oModel.metadataLoaded().then(() => {
                    this.getDynamicColumns(oColumns, "VENDORPO", "ZDV_3DERP_VPO");
                    setTimeout(() => {
                        this.getDynamicColumns(oColumns, "VPODTLS", "ZDV_3DERP_VPDTLS");
                    }, 100);
                    setTimeout(() => {
                        this.getDynamicColumns(oColumns,'VPODELSCHED','ZVB_VPO_DELSCHED');
                    }, 100);
                    setTimeout(() => {
                        this.getDynamicColumns(oColumns,'VPODELINV','ZDV_3DERP_DELINV');
                    }, 100);
                    setTimeout(() => {
                        this.getDynamicColumns(oColumns,'VPOHISTORY','ZDV_3DERP_POHIST');
                    }, 100);
                    setTimeout(() => {
                        this.getDynamicColumns(oColumns,'VPOCOND','ZDV_3DERP_COND');
                    }, 100);
                });

            },
            getDynamicColumns(arg1, arg2, arg3) {
                var me = this;               
                var oColumns = arg1;
                var modCode = arg2;
                var tabName = arg3;
                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new JSONModel();
                //var vSBU = this.getView().getModel("ui").getData().sbu;
                var vSBU = 'VER';

                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                // console.log(oModel)
                oModel.setHeaders({
                    sbu: vSBU,
                    type: modCode,
                    tabname: tabName
                });
                
                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        oJSONColumnsModel.setData(oData);

                        if (oData.results.length > 0) {
                            if (modCode === 'VENDORPO') {
                                var aColumns = me.setTableColumns(oColumns["VPOHdr"], oData.results);                               
                                me._aColumns["VPOHdr"] = aColumns["columns"];
                                /*me._aSortableColumns["gmc"] = aColumns["sortableColumns"];
                                me._aFilterableColumns["gmc"] = aColumns["filterableColumns"]; */
                                me.addColumns(me.byId("mainTab"), aColumns["columns"], "VPOHdr");
                            }
                            if (modCode === 'VPODTLS') {
                                console.log("COMMON-DTLS");
                                console.log(oData);
                                var aColumns = me.setTableColumns(oColumns["VPODtls"], oData.results);                               
                                me._aColumns["VPODtls"] = aColumns["columns"];
                                /*me._aSortableColumns["gmc"] = aColumns["sortableColumns"];
                                me._aFilterableColumns["gmc"] = aColumns["filterableColumns"]; */
                                me.addColumns(me.byId("detailsTab"), aColumns["columns"], "VPODtls");
                            }
                            if (modCode === 'VPODELSCHED') {
                                console.log("COMMON");
                                console.log(oData);
                                var aColumns = me.setTableColumns(oColumns["VPODelSched"], oData.results);                               
                                me._aColumns["VPODelSched"] = aColumns["columns"];
                                /*me._aSortableColumns["gmc"] = aColumns["sortableColumns"];
                                me._aFilterableColumns["gmc"] = aColumns["filterableColumns"]; */
                                me.addColumns(me.byId("delSchedTab"), aColumns["columns"], "VPODelSched");
                            }
                            if (modCode === 'VPODELINV') {
                                console.log("COMMON");
                                console.log(oData);
                                var aColumns = me.setTableColumns(oColumns["VPODelInv"], oData.results);                               
                                me._aColumns["VPODelInv"] = aColumns["columns"];
                                /*me._aSortableColumns["gmc"] = aColumns["sortableColumns"];
                                me._aFilterableColumns["gmc"] = aColumns["filterableColumns"]; */
                                me.addColumns(me.byId("delInvTab"), aColumns["columns"], "VPODelInv");
                            }
                            if (modCode === 'VPOHISTORY') {
                                console.log("COMMON");
                                console.log(oData);
                                var aColumns = me.setTableColumns(oColumns["VPOPOHist"], oData.results);                               
                                me._aColumns["VPOPOHist"] = aColumns["columns"];
                                /*me._aSortableColumns["gmc"] = aColumns["sortableColumns"];
                                me._aFilterableColumns["gmc"] = aColumns["filterableColumns"]; */
                                me.addColumns(me.byId("poHistTab"), aColumns["columns"], "VPOPOHist");
                            }
                            if (modCode === 'VPOCOND') {
                                console.log("COMMON");
                                console.log(oData);
                                var aColumns = me.setTableColumns(oColumns["VPOCond"], oData.results);                               
                                me._aColumns["VPOCond"] = aColumns["columns"];
                                /*me._aSortableColumns["gmc"] = aColumns["sortableColumns"];
                                me._aFilterableColumns["gmc"] = aColumns["filterableColumns"]; */
                                me.addColumns(me.byId("conditionsTab"), aColumns["columns"], "VPOCond");
                            }

                        }
                    },
                    error: function (err) {
                        me.closeLoadingDialog(that);
                    }
                });
            },
            addColumns(table, columns, model) {
                var aColumns = columns.filter(item => item.showable === true)
                aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                console.log("add columns "+ table + " - " + model);
                console.log(aColumns)

                aColumns.forEach(col => {
                    // console.log(col)
                    if (col.type === "STRING" || col.type === "DATETIME") {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            // id: col.name,
                            width: col.width,
                            sortProperty: col.name,
                            filterProperty: col.name,
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.Text({text: "{" + model + ">" + col.name + "}"}),
                            visible: col.visible
                        }));
                    }
                    else if (col.type === "NUMBER") {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "End",
                            sortProperty: col.name,
                            filterProperty: col.name,
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.Text({text: "{" + model + ">" + col.name + "}"}),
                            visible: col.visible
                        }));
                    }
                    else if (col.type === "BOOLEAN" ) {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "Center",
                            sortProperty: col.name,
                            filterProperty: col.name,                            
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.CheckBox({selected: "{" + model + ">" + col.name + "}", editable: false}),
                            visible: col.visible
                        }));
                    }
                })
            },
            setTableColumns: function(arg1, arg2) {
                var oColumn = arg1;
                var oMetadata = arg2;
                
                var aSortableColumns = [];
                var aFilterableColumns = [];
                var aColumns = [];

                oMetadata.forEach((prop, idx) => {
                    var vCreatable = prop.Editable;
                    var vUpdatable = prop.Editable;
                    var vSortable = true;
                    var vSorted = prop.Sorted;
                    var vSortOrder = prop.SortOrder;
                    var vFilterable = true;
                    var vName = prop.ColumnLabel;
                    var oColumnLocalProp = oColumn.filter(col => col.name.toUpperCase() === prop.ColumnName);
                    var vShowable = true;
                    var vOrder = prop.Order;

                    // console.loetco(prop)
                    if (vShowable) {
                        //sortable
                        if (vSortable) {
                            aSortableColumns.push({
                                name: prop.ColumnName, 
                                label: vName, 
                                position: +vOrder, 
                                sorted: vSorted,
                                sortOrder: vSortOrder
                            });
                        }

                        //filterable
                        if (vFilterable) {
                            aFilterableColumns.push({
                                name: prop.ColumnName, 
                                label: vName, 
                                position: +vOrder,
                                value: "",
                                connector: "Contains"
                            });
                        }
                    }

                    //columns
                    aColumns.push({
                        name: prop.ColumnName, 
                        label: vName, 
                        position: +vOrder,
                        type: prop.DataType,
                        creatable: vCreatable,
                        updatable: vUpdatable,
                        sortable: vSortable,
                        filterable: vFilterable,
                        visible: prop.Visible,
                        required: prop.Mandatory,
                        width: prop.ColumnWidth + 'rem',
                        sortIndicator: vSortOrder === '' ? "None" : vSortOrder,
                        hideOnChange: false,
                        valueHelp: oColumnLocalProp.length === 0 ? {"show": false} : oColumnLocalProp[0].valueHelp,
                        showable: vShowable,
                        key: prop.Key === '' ? false : true,
                        maxLength: prop.Length,
                        precision: prop.Decimal,
                        scale: prop.Scale !== undefined ? prop.Scale : null
                    })
                })

                /*aSortableColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                this.createViewSettingsDialog("sort", 
                    new JSONModel({
                        items: aSortableColumns,
                        rowCount: aSortableColumns.length,
                        activeRow: 0,
                        table: ""
                    })
                );

                aFilterableColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                this.createViewSettingsDialog("filter", 
                    new JSONModel({
                        items: aFilterableColumns,
                        rowCount: aFilterableColumns.length,
                        table: ""
                    })
                );*/

                aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                var aColumnProp = aColumns.filter(item => item.showable === true);

                /*this.createViewSettingsDialog("column", 
                    new JSONModel({
                        items: aColumnProp,
                        rowCount: aColumnProp.length,
                        table: ""
                    })
                );*/

                
                //return { columns: aColumns, sortableColumns: aSortableColumns, filterableColumns: aFilterableColumns };
                return { columns: aColumns};
            },
            onSBUChange: function(oEvent) {
                this._sbuChange = true;
                // console.log(this.byId('cboxSBU').getSelectedKey());
                // var vSBU = this.byId('cboxSBU').getSelectedKey();
                
                // this.showLoadingDialog('Loading...');
                // this.getGMC();
                // console.log(this.getView().byId("btnTabLayout"))
                this.byId("searchFieldMain").setEnabled(false);
                this.byId("btnAssign").setEnabled(false);
                this.byId("btnAssign").setEnabled(false);
                this.byId("btnUnassign").setEnabled(false);
                this.byId("btnCreatePO").setEnabled(false);
                this.byId("btnTabLayout").setEnabled(false);
            },
            getColumns1: async function() {
                var sPath = jQuery.sap.getModulePath("zuivendorpo", "/model/columns.json");
                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);
                var oModel = this.getOwnerComponent().getModel();
                oModel.metadataLoaded().then(() => {
                    setTimeout(() => {
                        this.getColumns('MANUAL_INIT','VENDORPO','ZDV_3DERP_VPO','mainTab');
                    }, 100);
                    setTimeout(() => {
                        this.getColumns('MANUAL_INIT','VPODTLS','ZDV_3DERP_VPDTLS','detailsTab');
                    }, 100);
                    setTimeout(() => {
                        this.getColumns('MANUAL_INIT','VPODELSCHED','ZVB_VPO_DELSCHED','delSchedTab');
                    }, 100);
                    setTimeout(() => {
                        this.getColumns('MANUAL_INIT','VPODELINV','ZDV_3DERP_DELINV','delInvTab');
                    }, 100);
                    setTimeout(() => {
                        this.getColumns('MANUAL_INIT','VPOHISTORY','ZDV_3DERP_POHIST','poHistTab');
                    }, 100);
                    setTimeout(() => {
                        this.getColumns('MANUAL_INIT','VPOCOND','ZDV_3DERP_COND','conditionsTab');
                    }, 100);
                });
                
            },
            onSearch: function () {
                /*this.byId("searchFieldMain").setProperty("value", "");
                this.showLoadingDialog('Loading...');
                var vSBU = this.getView().byId("cboxSBU").getSelectedKey();
                if (this.getView().getModel("ui").getData().sbu === '' || this._sbuChange) {
                   this.getColumns1();
                }
                else{
                    alert("manual else ")
                    this.getView().getModel("ui").setProperty("/sbu", vSBU);
                }*/

                //this.byId("smartFilterBar").filterBarExpanded=true;
            },
            showLoadingDialog(arg) {
                if (!this._LoadingDialog) {
                    this._LoadingDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.LoadingDialog", this);
                    this.getView().addDependent(this._LoadingDialog);
                }
                // jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                
                this._LoadingDialog.setTitle(arg);
                this._LoadingDialog.open();
            },
            closeLoadingDialog() {
                this._LoadingDialog.close();
            },
            onKeyUp(oEvent) {
                var _dataMode = this.getView().getModel("ui").getData().dataMode;
                _dataMode = _dataMode === undefined ? "READ": _dataMode;

                if ((oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") && oEvent.srcControl.sParentAggregationName === "rows"){// && _dataMode === "READ") {
                    var sRowPath = this.byId(oEvent.srcControl.sId).oBindingContexts["VPOHdr"].sPath;
                    var oRow = this.getView().getModel("VPOHdr").getProperty(sRowPath);
                    this.getView().getModel("ui").setProperty("/activePONo", oRow.PONO);
                    this.getView().getModel("ui").setProperty("/activeCondRec", oRow.CONDREC);
                    this.getPODetails2(oRow.PONO);
                    this.getDelSchedule2(oRow.PONO);
                    this.getDelInvoice2(oRow.PONO);
                    this.getPOHistory2(oRow.PONO);
                    this.getConditions2(oRow.CONDREC);
                }
            },

            onCreateManualPO() {
                if (this.getView().getModel("ui").getData().sbu) {
                    var sSbu = this.getView().getModel("ui").getData().sbu;
                    console.log("onCreateManualPO", sSbu)
                    that._router.navTo("RouteCreateManualPO", {
                        sbu: sSbu
                    });
                } else {
                    sap.m.MessageBox.information("SBU is required.");
                }
            }
        });
    });
