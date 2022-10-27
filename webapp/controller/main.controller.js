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
        var _promiseResult;

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
                this._columnLoadError = false;
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                // this.getCols();
                // this.getMain();
            },
            setSmartFilterModel: function () {
                //Model StyleHeaderFilters is for the smartfilterbar
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_VPO_FILTERS_CDS");
                var oSmartFilter = this.getView().byId("smartFilterBar");
                oSmartFilter.setModel(oModel);
            },
            onSearch: async function(){
                var me = this;
                this.showLoadingDialog('Loading...');
                _promiseResult = new Promise((resolve, reject)=>{
                    me.getMain();
                    resolve();
                });
                await _promiseResult;
                
                
                _promiseResult = new Promise((resolve, reject)=>{
                    setTimeout(() => {
                        me.getCols();
                        resolve();
                    }, 500);
                });
                await _promiseResult;
                this.closeLoadingDialog();

            },
            getMain: async function(){
                var oModel = this.getOwnerComponent().getModel();
                var _this = this;
                var poNo;
                var condrec;

                var vSBU = this.getView().getModel("ui").getData().sbu;
                _promiseResult = new Promise((resolve, reject) => {
                        
                    oModel.read('/mainSet', { 
                        success: function (data, response) {
                            if (data.results.length > 0) {
                                data.results.forEach(item => {
                                    item.PODT = dateFormat.format(item.PODT);
                                })
                                
                                /*data.results.sort((a,b) => (a.GMC > b.GMC ? 1 : -1));*/
                                
                                poNo = data.results[0].PONO;
                                condrec = data.results[0].CONDREC;
                                var oJSONModel = new sap.ui.model.json.JSONModel();
                                oJSONModel.setData(data);
                                _this.getView().setModel(oJSONModel, "VPOHdr");
                                _this.getView().getModel("ui").setProperty("/activePONo", poNo);
                                _this.getView().getModel("ui").setProperty("/activeCondRec", condrec);
                                _this.getPODetails2(poNo);
                                _this.getDelSchedule2(poNo);
                                _this.getDelInvoice2(poNo);
                                _this.getPOHistory2(poNo);
                                _this.getConditions2(poNo);
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
                            
                            resolve();
                            _this.closeLoadingDialog();
                        },
                        error: function (err) { }
                    });
                    
                    
                });
                await _promiseResult;
            },
            getPOHistory2: async function(PONO){
                var oModel = this.getOwnerComponent().getModel();
                var _this = this;
                oModel.read('/VPOHistSet', { 
                    urlParameters: {
                        "$filter": "PONO eq '" + PONO + "'"
                    },
                    success: function (data, response) {
                        if (data.results.length > 0) {
                            data.results.forEach(item => {
                                item.POSTDT = dateFormat.format(new Date(item.POSTDT));
                            })
                            var oJSONModel = new sap.ui.model.json.JSONModel();
                            oJSONModel.setData(data);
                        }
                        _this.getView().setModel(oJSONModel, "VPOPOHist");
                        _this.closeLoadingDialog();
                    },
                    error: function (err) { }
                });
            },
            getDelInvoice2: async function(PONO){
                var oModel = this.getOwnerComponent().getModel();
                var _this = this;
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
                });
                
            },
            getConditions2: async function(CONDREC){
                var oModel = this.getOwnerComponent().getModel();
                var _this = this;
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
                });
                
            },
            getDelSchedule2: async function(PONO){
                var oModel = this.getOwnerComponent().getModel();
                var _this = this;
                oModel.read('/VPODelSchedSet', { 
                    urlParameters: {
                        "$filter": "PONO eq '" + PONO + "'"
                    },
                    success: function (data, response) {
                        if (data.results.length > 0) {
                            var oJSONModel = new sap.ui.model.json.JSONModel();
                            oJSONModel.setData(data);
                        }
                        _this.getView().setModel(oJSONModel, "VPODelSched");
                        _this.closeLoadingDialog();
                    },
                    error: function (err) { }
                });
                
            },
            getPODetails2: async function(PONO){
                var oModel = this.getOwnerComponent().getModel();
                var _this = this;
                oModel.read('/VPODetailsSet', { 
                    urlParameters: {
                        "$filter": "PONO eq '" + PONO + "'"
                    },
                    success: function (data, response) {
                        if (data.results.length > 0) {
                            console.log(data);
                            var oJSONModel = new sap.ui.model.json.JSONModel();
                            oJSONModel.setData(data);
                        }
                        _this.getView().setModel(oJSONModel, "VPODtls");
                        _this.closeLoadingDialog();
                    },
                    error: function (err) { }
                });
            },
            setSmartFilterModel: function () {
                //Model StyleHeaderFilters is for the smartfilterbar
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_VPO_FILTERS_CDS");
                var oSmartFilter = this.getView().byId("smartFilterBar");
                oSmartFilter.setModel(oModel);
            },

            getCols: async function() {
                var sPath = jQuery.sap.getModulePath("zuivendorpo", "/model/columns.json");
                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();
                var oModel = this.getOwnerComponent().getModel();
                console.log(oModel);
                oModel.metadataLoaded().then(() => {
                    setTimeout(() => {
                        this.getDynamicColumns(oColumns, "VENDORPO", "ZDV_3DERP_VPO");
                    }, 100);
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
                var vSBU = this.getView().getModel("ui").getData().sbu;

                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                // console.log(oModel)
                oModel.setHeaders({
                    sbu: vSBU,
                    type: modCode,
                    tabname: tabName
                });
                oModel.read("/ColumnsSet", {
                    success: async function (oData, oResponse) {
                        
                        if (oData.results.length > 0) {
                            me._columnLoadError = false;
                            if (modCode === 'VENDORPO') {
                                oJSONColumnsModel.setData(oData.results);
                                me.getView().setModel(oJSONColumnsModel, "VENDORPOColumns");
                                me.setTableColumnsData(modCode);
                                
                            }
                            if (modCode === 'VPODTLS') {
                                oJSONColumnsModel.setData(oData.results);
                                me.getView().setModel(oJSONColumnsModel, "VPODTLSColumns");
                                me.setTableColumnsData(modCode);
                            }
                            if (modCode === 'VPODELSCHED') {
                                oJSONColumnsModel.setData(oData.results);
                                me.getView().setModel(oJSONColumnsModel, "VPODELSCHEDColumns");
                                me.setTableColumnsData(modCode);
                            }
                            if (modCode === 'VPODELINV') {
                                oJSONColumnsModel.setData(oData.results);
                                me.getView().setModel(oJSONColumnsModel, "VPODELINVColumns");
                                me.setTableColumnsData(modCode);
                            }
                            if (modCode === 'VPOHISTORY') {
                                oJSONColumnsModel.setData(oData.results);
                                me.getView().setModel(oJSONColumnsModel, "VPOHISTORYColumns");
                                me.setTableColumnsData(modCode);
                            }
                            if (modCode === 'VPOCOND') {
                                oJSONColumnsModel.setData(oData.results);
                                me.getView().setModel(oJSONColumnsModel, "VPOCONDColumns");
                                me.setTableColumnsData(modCode);
                            }

                        }else{
                            me._columnLoadError = true;
                            if (modCode === 'VENDORPO') {
                                me.getView().setModel(oJSONColumnsModel, "VENDORPOColumns");
                                me.setTableColumnsData(modCode);
                                
                            }
                            if (modCode === 'VPODTLS') {
                                me.getView().setModel(oJSONColumnsModel, "VPODTLSColumns");
                                me.setTableColumnsData(modCode);
                            }
                            if (modCode === 'VPODELSCHED') {
                                me.getView().setModel(oJSONColumnsModel, "VPODELSCHEDColumns");
                                me.setTableColumnsData(modCode);
                            }
                            if (modCode === 'VPODELINV') {
                                me.getView().setModel(oJSONColumnsModel, "VPODELINVColumns");
                                me.setTableColumnsData(modCode);
                            }
                            if (modCode === 'VPOHISTORY') {
                                me.getView().setModel(oJSONColumnsModel, "VPOHISTORYColumns");
                                me.setTableColumnsData(modCode);
                            }
                            if (modCode === 'VPOCOND') {
                                me.getView().setModel(oJSONColumnsModel, "VPOCONDColumns");
                                me.setTableColumnsData(modCode);
                            }

                        }
                    },
                    error: function (err) {
                        me._columnLoadError = true;
                        me.closeLoadingDialog(that);
                    }
                });
            },
            setTableColumnsData(modCode){
                var me = this;
                var oColumnsModel;
                var oDataModel;

                var oColumnsData;
                var oData;
                
                if (modCode === 'VENDORPO') {     
                    oColumnsModel = me.getView().getModel("VPOHdr");  
                    oDataModel = me.getView().getModel("VENDORPOColumns"); 

                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');
                    
                    if(me._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');                 
                    me.addColumns("mainTab", oColumnsData, oData, "VPOHdr");
                }
                if (modCode === 'VPODTLS') {
                    oColumnsModel = me.getView().getModel("VPODtls");  
                    oDataModel = me.getView().getModel("VPODTLSColumns"); 
                    
                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');

                    if(me._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');   
                    me.addColumns("detailsTab", oColumnsData, oData, "VPODtls");
                }
                if (modCode === 'VPODELSCHED') {
                    oColumnsModel = me.getView().getModel("VPODelSched");  
                    oDataModel = me.getView().getModel("VPODELSCHEDColumns"); 
                    
                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');

                    if(me._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');   
                    me.addColumns("delSchedTab", oColumnsData, oData, "VPODelSched");
                }
                if (modCode === 'VPODELINV') {
                    oColumnsModel = me.getView().getModel("VPODelInv");  
                    oDataModel = me.getView().getModel("VPODELINVColumns"); 
                    
                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');

                    if(me._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');   
                    me.addColumns("delInvTab", oColumnsData, oData, "VPODelInv");
                }
                if (modCode === 'VPOHISTORY') {
                    oColumnsModel = me.getView().getModel("VPOPOHist");  
                    oDataModel = me.getView().getModel("VPOHISTORYColumns"); 
                    
                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');

                    if(me._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');   
                    me.addColumns("poHistTab", oColumnsData, oData, "VPOPOHist");
                }
                if (modCode === 'VPOCOND') {
                    oColumnsModel = me.getView().getModel("VPOCond");  
                    oDataModel = me.getView().getModel("VPOCONDColumns"); 
                    
                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');

                    if(me._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');   
                    me.addColumns("conditionsTab", oColumnsData, oData, "VPOCond");
                }
            },
            addColumns: async function(table, columnsData, data, model) {
                var me = this;
                var oModel = new JSONModel();
                oModel.setData({
                    columns: columnsData,
                    rows: data
                });

                var oTable = this.getView().byId(table);
                
                oTable.setModel(oModel);

                oTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = context.getObject().ColumnLabel;
                    var sColumnType = context.getObject().DataType;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    if (sColumnType === "STRING" || sColumnType === "DATETIME") {
                        return new sap.ui.table.Column({
                            id: model+"-"+sColumnId,
                            label: sColumnLabel,
                            template: me.columnTemplate(sColumnId), //default text
                            width: sColumnWidth + "px",
                            hAlign: "Left",
                            sortProperty: sColumnId,
                            filterProperty: sColumnId,
                            autoResizable: true,
                            visible: sColumnVisible,
                            sorted: sColumnSorted,
                            sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                        });
                    }else if (sColumnType === "NUMBER") {
                        return new sap.ui.table.Column({
                            id: model+"-"+sColumnId,
                            label: sColumnLabel,
                            template: new sap.m.Text({ text: "{" + sColumnId + "}", wrapping: false, tooltip: "{" + sColumnId + "}" }), //default text
                            width: sColumnWidth + "px",
                            hAlign: "End",
                            sortProperty: sColumnId,
                            filterProperty: sColumnId,
                            autoResizable: true,
                            visible: sColumnVisible,
                            sorted: sColumnSorted,
                            sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                        });
                    } else if (sColumnId === "DELETED" ) {
                        return new sap.ui.table.Column({
                            id: model+"-"+sColumnId,
                            label: sColumnLabel,
                            template: new sap.m.CheckBox({
                                selected: "{" + sColumnId + "}",
                                editable: false
                            }),
                            width: sColumnWidth + "px",
                            hAlign: "Center",
                            sortProperty: sColumnId,
                            filterProperty: sColumnId,
                            autoResizable: true,
                            visible: sColumnVisible,
                            sorted: sColumnSorted,
                            sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                        });
                    }

                });

                //bind the data to the table
                oTable.bindRows("/rows");
                
            },
            columnTemplate: function(sColumnId){
                var oColumnTemplate;
                oColumnTemplate = new sap.m.Text({ text: "{" + sColumnId + "}", wrapping: false, tooltip: "{" + sColumnId + "}" }); //default text
                if (sColumnId === "DELETED") { 
                    //Manage button
                    oColumnTemplate = new sap.m.CheckBox({
                        selected: "{" + sColumnId + "}",
                        editable: false
                    });
                }
                if (sColumnId === "CLOSED") { 
                    //Manage button
                    oColumnTemplate = new sap.m.CheckBox({
                        selected: "{" + sColumnId + "}",
                        editable: false
                    });
                }
                if (sColumnId === "UNLIMITED") { 
                    //Manage button
                    oColumnTemplate = new sap.m.CheckBox({
                        selected: "{" + sColumnId + "}",
                        editable: false
                    });
                }
                if (sColumnId === "INVRCPTIND") { 
                    //Manage button
                    oColumnTemplate = new sap.m.CheckBox({
                        selected: "{" + sColumnId + "}",
                        editable: false
                    });
                }
                if (sColumnId === "GRBASEDIVIND") { 
                    //Manage button
                    oColumnTemplate = new sap.m.CheckBox({
                        selected: "{" + sColumnId + "}",
                        editable: false
                    });
                }
    
                return oColumnTemplate;
            },
            onSBUChange: function(oEvent) {
                this._sbuChange = true;
                this.getView().getModel("ui").setProperty("/sbu", this.getView().byId("cboxSBU").getSelectedKey());
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
            onClickEdit: async function(){
                var PONo = this.getView().getModel("ui").getProperty("/activePONo");
                var CONDREC = this.getView().getModel("ui").getProperty("/activeCondRec");
                var SBU = this.getView().getModel("ui").getData().sbu;
                this.navToDetail(PONo, CONDREC, SBU);
                
            },
            navToDetail(PONo, CONDREC, SBU){
                this._router.navTo("vendorpodetail", {
                    PONO: PONo,
                    CONDREC: CONDREC,
                    SBU: SBU
                });
            },
            onSaveTableLayout: function (table) {
                console.log(table);
                var type;
                var tabName

                if(table == 'mainTab'){
                    type = "VENDORPO";
                    tabName = "ZDV_3DERP_VPO";
                }
                if(table == 'detailsTab'){
                    type = "VPODTLS";
                    tabName = "ZDV_3DERP_VPDTLS";
                }
                if(table == 'delSchedTab'){
                    type = "VPODELSCHED";
                    tabName = "ZVB_VPO_DELSCHED";
                }
                if(table == 'delInvTab'){
                    type = "VPODELINV";
                    tabName = "ZDV_3DERP_DELINV";
                }
                if(table == 'poHistTab'){
                    type = "VPOHISTORY";
                    tabName = "ZDV_3DERP_POHIST";
                }
                if(table == 'mainconditionsTabTab'){
                    type = "VPOCOND";
                    tabName = "ZDV_3DERP_COND";
                }
                    
                
                // saving of the layout of table
                var me = this;
                var ctr = 1;
                var oTable = this.getView().byId(table);
                var oColumns = oTable.getColumns();
                var vSBU = this.getView().getModel("ui").getData().sbu;
    
                var oParam = {
                    "SBU": vSBU,
                    "TYPE": type,
                    "TABNAME": tabName,
                    "TableLayoutToItems": []
                };
                console.log(oColumns);
                
                //get information of columns, add to payload
                oColumns.forEach((column) => {
                    oParam.TableLayoutToItems.push({
                        COLUMNNAME: column.sId.split("-")[1],
                        ORDER: ctr.toString(),
                        SORTED: column.mProperties.sorted,
                        SORTORDER: column.mProperties.sortOrder,
                        SORTSEQ: "1",
                        VISIBLE: column.mProperties.visible,
                        WIDTH: column.mProperties.width.replace('rem','')
                    });
    
                    ctr++;
                });
                console.log(oParam);
    
                //call the layout save
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
    
                oModel.create("/TableLayoutSet", oParam, {
                    method: "POST",
                    success: function(data, oResponse) {
                        sap.m.MessageBox.information("Layout saved.");
                        //Common.showMessage(me._i18n.getText('t6'));
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(err);
                    }
                });                
            },
            // onSelectionChange: async function(oEvent){
            //     console.log(oEvent.getParameter("rowContext"));
            //     if(oEvent.getParameter("rowContext") === undefined){
            //         return;
            //     }
            //     var sPath = oEvent.getParameter("rowContext") === undefined? "" : oEvent.getParameter("rowContext").getPath();

            //     console.log(sPath);
            //     var oTable = this.getView().byId("mainTab");
            //     var model = oTable.getModel();
            //     var data  = model.getProperty(sPath); 

            //     this.getView().getModel("ui").setProperty("/activePONo", data.PONO);
            //     this.getView().getModel("ui").setProperty("/activeCondRec", data.CONDREC);

            //     _promiseResult = new Promise((resolve,reject)=>{
            //         this.getPODetails2(data.PONO);
            //         this.getDelSchedule2(data.PONO);
            //         this.getDelInvoice2(data.PONO);
            //         this.getPOHistory2(data.PONO);
            //         this.getConditions2(data.CONDREC);
            //         resolve();
            //     });
            //     await _promiseResult;
                
            // },
            onKeyUp: async function(oEvent) {
                var me = this;
                var _dataMode = this.getView().getModel("ui").getData().dataMode;
                _dataMode = _dataMode === undefined ? "READ": _dataMode;

                if ((oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") && oEvent.srcControl.sParentAggregationName === "rows"){// && _dataMode === "READ") {
                    var sRowPath = this.byId(oEvent.srcControl.sId).oBindingContexts["undefined"].sPath;
                    sRowPath = "/results/"+ sRowPath.split("/")[2];
                    var oRow = this.getView().getModel("VPOHdr").getProperty(sRowPath);
                    var oTable = this.byId("mainTab");
                    this.getView().getModel("ui").setProperty("/activePONo", oRow.PONO);
                    this.getView().getModel("ui").setProperty("/activeCondRec", oRow.CONDREC);
                    _promiseResult = new Promise((resolve,reject)=>{
                        setTimeout(() => {
                            me.getPODetails2(oRow.PONO);
                            me.getDelSchedule2(oRow.PONO);
                            me.getDelInvoice2(oRow.PONO);
                            me.getPOHistory2(oRow.PONO);
                            me.getConditions2(oRow.CONDREC);
                            resolve();
                        }, 500);
                        
                    });
                    
                    await _promiseResult;

                    _promiseResult = new Promise((resolve,reject)=>{
                        setTimeout(() => {
                            // me.setTableColumnsData('VENDORPO');
                            me.setTableColumnsData('VPODTLS');
                            me.setTableColumnsData('VPODELSCHED');
                            me.setTableColumnsData('VPODELINV');
                            me.setTableColumnsData('VPOHISTORY');
                            me.setTableColumnsData('VPOCOND');
                            resolve();
                        }, 1000);
                    });
                    await _promiseResult;
                    var index = sRowPath.split("/");
                    oTable.setSelectedIndex(parseInt(index[2]));
                }
            },
            onColumnUpdated(oEvent){
                var oTable = oEvent.getSource();
                var sModel;
                if (oTable.getId().indexOf("mainTab") >= 0) {
                    sModel = "mainTab";
                }
                this.setActiveRowHighlight(sModel);
            },
            setActiveRowHighlight(model){
                var oTable = this.byId(model);

                setTimeout(() => {
                    var iActiveRowIndex = oTable.getModel("VPOHdr").getData().results.findIndex(item => item.ACTIVE === "X");

                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext("VPOHdr") && +row.getBindingContext("VPOHdr").sPath.replace("/results/", "") === iActiveRowIndex) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow");
                    })
                }, 1);
            },
            onFirstVisibleRowChanged: function (oEvent) {
                var oTable = oEvent.getSource();
                var sModel;

                if (oTable.getId().indexOf("mainTab") >= 0) {
                    sModel = "VPOHdr";
                }

                setTimeout(() => {
                    var oData = oTable.getModel(sModel).getData().results;
                    var iStartIndex = oTable.getBinding("rows").iLastStartIndex;
                    var iLength = oTable.getBinding("rows").iLastLength + iStartIndex;

                    if (oTable.getBinding("rows").aIndices.length > 0) {
                        for (var i = iStartIndex; i < iLength; i++) {
                            var iDataIndex = oTable.getBinding("rows").aIndices.filter((fItem, fIndex) => fIndex === i);
    
                            if (oData[iDataIndex].ACTIVE === "X") oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].addStyleClass("activeRow");
                            else oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].removeStyleClass("activeRow");
                        }
                    }
                    else {
                        for (var i = iStartIndex; i < iLength; i++) {
                            if (oData[i].ACTIVE === "X") oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].addStyleClass("activeRow");
                            else oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].removeStyleClass("activeRow");
                        }
                    }
                }, 1);
            },
            onCellClickGMC: async function(oEvent) {
                console.log(oEvent.getSource());
                console.log(oEvent.getParameters().rowBindingContext.sPath);

                var sRowPath = oEvent.getParameters().rowBindingContext.sPath;
                sRowPath = "/results/"+ sRowPath.split("/")[2];
                var oRow = this.getView().getModel("VPOHdr").getProperty(sRowPath);
                var oTable = this.byId("mainTab");

                this.getView().getModel("ui").setProperty("/activePONo", oRow.PONO);
                this.getView().getModel("ui").setProperty("/activeCondRec", oRow.CONDREC);


                var vGmc = oEvent.getParameters().rowBindingContext.getObject().VPOHdr;
                var PONo = this.getView().getModel("ui").getProperty("/activePONo");
                var me = this;
                
                // this.getView().getModel("ui").setProperty("/activeGmc", vGmc);
                // this.getMaterials(false);
                // this.getAttributes(false);
                // this.byId("searchFieldAttr").setProperty("value", "");
                // this.byId("searchFieldMatl").setProperty("value", "");
                

                _promiseResult = new Promise((resolve,reject)=>{
                    setTimeout(() => {
                        me.getPODetails2(PONo);
                        me.getDelSchedule2(PONo);
                        me.getDelInvoice2(PONo);
                        me.getPOHistory2(PONo);
                        me.getConditions2(PONo);
                        resolve();
                    }, 500);
                    
                });
                
                await _promiseResult;

                _promiseResult = new Promise((resolve,reject)=>{
                    setTimeout(() => {
                        // me.setTableColumnsData('VENDORPO');
                        me.setTableColumnsData('VPODTLS');
                        me.setTableColumnsData('VPODELSCHED');
                        me.setTableColumnsData('VPODELINV');
                        me.setTableColumnsData('VPOHISTORY');
                        me.setTableColumnsData('VPOCOND');
                        resolve();
                    }, 500);
                });
                await _promiseResult;

                // var oTable = this.byId('detailsTab');
                // var oColumns = oTable.getColumns();

                // for (var i = 0, l = oColumns.length; i < l; i++) {
                //     if (oColumns[i].getFiltered()) {
                //         oColumns[i].filter("");
                //     }

                //     if (oColumns[i].getSorted()) {
                //         oColumns[i].setSorted(false);
                //     }
                // }

                // oTable = this.byId('mainTab');
                // oColumns = oTable.getColumns();

                // for (var i = 0, l = oColumns.length; i < l; i++) {
                //     if (oColumns[i].getFiltered()) {
                //         oColumns[i].filter("");
                //     }

                //     if (oColumns[i].getSorted()) {
                //         oColumns[i].setSorted(false);
                //     }
                // }

                // if (oEvent.getParameters().rowBindingContext) {
                //     var oTable = oEvent.getSource(); //this.byId("ioMatListTab");
                //     var sRowPath = oEvent.getParameters().rowBindingContext.sPath;

                //     oTable.getModel("VPOHdr").getData().results.forEach(row => row.ACTIVE = "");
                //     oTable.getModel("VPOHdr").setProperty(sRowPath + "/ACTIVE", "X"); 
                    
                //     oTable.getRows().forEach(row => {
                //         if (row.getBindingContext("VPOHdr") && row.getBindingContext("VPOHdr").sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                //             row.addStyleClass("activeRow");
                //         }
                //         else row.removeStyleClass("activeRow")
                //     })
                // }
            },
            
        });
    });
