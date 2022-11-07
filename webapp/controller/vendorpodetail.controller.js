sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/Filter',
    // "../js/Common",
    // "../js/Utils",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    'sap/m/MessageToast',
    'jquery.sap.global',
    'sap/ui/core/routing/HashChanger'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Filter, JSONModel, MessageBox, MessageToast, Utils, jQuery, HashChanger) {
        "use strict";

        var that;
        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
        var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });
        var _promiseResult;
        var _withGR;

        return Controller.extend("zuivendorpo.controller.vendorpodetail", {

            onInit: function () {
                that = this;
                this._columnLoadError = false;
                this._oDataBeforeChange = {}
                this._oDataRemarksBeforeChange = {}
                this._oDataPkgInstBeforeChange = {}

                this._isEdited = false
                this._DiscardChangesDialog = null;
                this.validationErrors = [];
                this._validPOChange;

                //Vendor Change
                this._purchOrg;
                this._purchGrp;
                this._vendorCd;
                this._newVendorCd;
                this._newDlvDate;
                
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_VPO_FILTERS_CDS");
                this.getView().setModel(oModel);

                console.log(oModel);
                //Initialize router
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                that.callCaptionsAPI();
                this._router.getRoute("vendorpodetail").attachPatternMatched(this._routePatternMatched, this);
                
                //Initialize translations
                this._i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                this.getView().setModel(new JSONModel({
                    dataMode: 'NODATA',
                }), "ui");
            },
            _routePatternMatched: async function (oEvent) {
                var me = this;
                this._pono = oEvent.getParameter("arguments").PONO;
                this._condrec = oEvent.getParameter("arguments").CONDREC;
                this._sbu = oEvent.getParameter("arguments").SBU;
                
                // //Load header
                this.getHeaderData(); //get header data
                this.loadReleaseStrategy();

                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.getMain());
                });
                await _promiseResult;
                
                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.getCols());
                });
                await _promiseResult;
                
                this.hdrTextLoadCol();
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.pkngInstTblLoad());
                });
                await _promiseResult;

                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.remarksTblLoad());
                });
                await _promiseResult;

                this.getView().getModel("ui").setProperty("/dataMode", 'READ');

                // this.getColorsTable();

                // //Load value helps
                // Utils.getStyleSearchHelps(this);
                // Utils.getAttributesSearchHelps(this);
                // Utils.getProcessAttributes(this);

                // //Attachments
                // this.bindUploadCollection();
                // this.getView().getModel("FileModel").refresh();
            },
            loadAllData: async function(){
                var me = this;
                // //Load header
                this.getHeaderData(); //get header data
                this.loadReleaseStrategy();

                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.getMain());
                });
                await _promiseResult;
                
                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.getCols());
                });
                await _promiseResult;
                
                this.hdrTextLoadCol();
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.pkngInstTblLoad());
                });
                await _promiseResult;

                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.remarksTblLoad());
                });
                await _promiseResult;

                this.getView().getModel("ui").setProperty("/dataMode", 'READ');

                return true;
            },
            callCaptionsAPI: async function(){
                var oJSONModel = new JSONModel();
                var oDDTextParam = [];
                var oDDTextResult = [];
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
    
                //Detail IconTabFilter
                oDDTextParam.push({CODE: "MATDATA"});
                oDDTextParam.push({CODE: "QTYDT"});
                oDDTextParam.push({CODE: "SUPTYP"});
                oDDTextParam.push({CODE: "CUSTDATA"});

                //Header Top
                oDDTextParam.push({CODE: "CREATEDBY"});
                oDDTextParam.push({CODE: "CREATEDDT"});
                oDDTextParam.push({CODE: "HEADER"});
                oDDTextParam.push({CODE: "DETAILS"});
                //Header
                oDDTextParam.push({CODE: "PRNO"});
                oDDTextParam.push({CODE: "PRITM"});
                oDDTextParam.push({CODE: "MATNO"});
                oDDTextParam.push({CODE: "REQUISITIONER"});
                oDDTextParam.push({CODE: "REQDT"});
                oDDTextParam.push({CODE: "GMCDESCEN"});
                oDDTextParam.push({CODE: "ADDTLDESCEN"});
                //Material Data
                oDDTextParam.push({CODE: "SHORTTEXT"});
                oDDTextParam.push({CODE: "BATCH"});
                oDDTextParam.push({CODE: "MATGRP"});
                oDDTextParam.push({CODE: "MATTYP"});
                //Quantities/Dates
                oDDTextParam.push({CODE: "QUANTITY"});
                oDDTextParam.push({CODE: "ORDERQTY"});
                oDDTextParam.push({CODE: "OPENQTY"});
                oDDTextParam.push({CODE: "DELVDATE"});
                oDDTextParam.push({CODE: "REQDT"});
                oDDTextParam.push({CODE: "RELDT"});
                oDDTextParam.push({CODE: "DELETED"});
                oDDTextParam.push({CODE: "CLOSED"});
                //Supply Type
                oDDTextParam.push({CODE: "INFORECORD"});
                oDDTextParam.push({CODE: "VENDOR"});
                oDDTextParam.push({CODE: "PURORG"});
                //Customer Data
                oDDTextParam.push({CODE: "SUPTYP"});
                oDDTextParam.push({CODE: "SALESGRP"});
                oDDTextParam.push({CODE: "CUSTGRP"});
                oDDTextParam.push({CODE: "SEASON"});
                
                await oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                    method: "POST",
                    success: function(oData, oResponse) {
                        oData.CaptionMsgItems.results.forEach(item=>{
                            oDDTextResult[item.CODE] = item.TEXT;
                        })
                        
                        console.log(oDDTextResult)
                        oJSONModel.setData(oDDTextResult);
                        that.getView().setModel(oJSONModel, "captionMsg");
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(err);
                    }
                });
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
            getHeaderData: function () {
                var me = this;
                var poNo = this._pono;
                var pritm = this._pritm;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new sap.ui.model.json.JSONModel();
                var oJSONEdit = new sap.ui.model.json.JSONModel();
                var oView = this.getView();
                var edditableFields = [];

                this.showLoadingDialog('Loading...');

                //read Style header data
                
                var entitySet = "/mainSet(PONO='" + poNo + "')"
                oModel.read(entitySet, {
                    success: function (oData, oResponse) {
                       
                        if (oData.PODT !== null)
                            oData.PODT = dateFormat.format(new Date(oData.PODT));
                        
                        oJSONModel.setData(oData);
                        for (var oDatas in oData) {
                            //get only editable fields
                            edditableFields[oDatas] = false;
                            console.log(oDatas);
                            
                        }
                            
                        console.log(edditableFields);
                        oJSONEdit.setData(edditableFields);
                        // console.log(oView.getModel("topHeaderData"))
                        
                        oView.setModel(oJSONModel, "topHeaderData");
                        oView.setModel(oJSONEdit, "topHeaderDataEdit");
                        me.closeLoadingDialog(that);
                        // me.setChangeStatus(false);
                    },
                    error: function () {
                        me.closeLoadingDialog(that);
                    }
                })
            },
            getMain: async function(){
                this._oDataBeforeChange = {}
                var oModel = this.getOwnerComponent().getModel();
                var _this = this;
                var poNo = this._pono;
                var condrec = this._condrec;

                return new Promise((resolve, reject) => {
                    _this.getView().setModel(new JSONModel({
                        results: []
                    }), "VPODtlsVPODet");

                    _this.getView().setModel(new JSONModel({
                        results: []
                    }), "VPODelSchedVPODet");

                    _this.getView().setModel(new JSONModel({
                        results: []
                    }), "VPODelInvVPODet");

                    _this.getView().setModel(new JSONModel({
                        results: []
                    }), "VPOPOHistVPODet");

                    _this.getView().setModel(new JSONModel({
                        results: []
                    }), "VPOCondVPODet");
                    resolve(_this.getPODetails2(poNo));
                    resolve(_this.getDelSchedule2(poNo));
                    resolve(_this.getDelInvoice2(poNo));
                    resolve(_this.getPOHistory2(poNo));
                    resolve(_this.getConditions2(condrec));
                    resolve();
                });
            },

            getPOHistory2: async function(PONO){
                var oModel = this.getOwnerComponent().getModel();
                var _this = this;
                var vSBU = this._sbu;
                return new Promise((resolve, reject)=>{
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
                            _this.getView().setModel(oJSONModel, "VPOPOHistVPODet");
                            resolve();
                        },
                        error: function (err) { }
                    });
                });
            },
            getDelInvoice2: async function(PONO){
                var oModel = this.getOwnerComponent().getModel();
                var _this = this;
                var vSBU = this._sbu;
                return new Promise((resolve, reject)=>{
                    oModel.read('/VPODelInvSet', { 
                        urlParameters: {
                            "$filter": "PONO eq '" + PONO + "'"
                        },
                        success: function (data, response) {
                            if (data.results.length > 0) {
                                var oJSONModel = new sap.ui.model.json.JSONModel();
                                oJSONModel.setData(data);
                            }
                            _this.getView().setModel(oJSONModel, "VPODelInvVPODet");
                            resolve();
                        },
                        error: function (err) { }
                    });
                });
                
            },
            getConditions2: async function(CONDREC){
                var oModel = this.getOwnerComponent().getModel();
                var _this = this;
                var vSBU = this._sbu;
                return new Promise((resolve, reject)=>{
                    oModel.read('/VPOConditionsSet', { 
                        urlParameters: {
                            "$filter": "KNUMV eq '" + CONDREC + "'"
                        },
                        success: function (data, response) {
                            if (data.results.length > 0) {
                                var oJSONModel = new sap.ui.model.json.JSONModel();
                                oJSONModel.setData(data);
                            }
                            _this.getView().setModel(oJSONModel, "VPOCondVPODet");
                            resolve();
                        },
                        error: function (err) { }
                    });
                });
                
            },
            getDelSchedule2: async function(PONO){
                var oModel = this.getOwnerComponent().getModel();
                var _this = this;
                var vSBU = this._sbu;
                return new Promise((resolve, reject)=>{
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
                            _this.getView().setModel(oJSONModel, "VPODelSchedVPODet");
                            resolve();
                        },
                        error: function (err) { }
                    });
                });
                
            },
            getPODetails2: async function(PONO){
                var oModel = this.getOwnerComponent().getModel();
                var _this = this;
                var vSBU = this._sbu;
                return new Promise((resolve, reject)=>{
                    oModel.read('/VPODetailsSet', { 
                        urlParameters: {
                            "$filter": "PONO eq '" + PONO + "'"
                        },
                        success: function (data, response) {
                            if (data.results.length > 0) {
                                var oJSONModel = new sap.ui.model.json.JSONModel();
                                oJSONModel.setData(data);
                            }
                            _this.getView().setModel(oJSONModel, "VPODtlsVPODet");
                            resolve();
                        },
                        error: function (err) { }
                    });
                });
            },

            getCols: async function() {
                
                var oModel = this.getOwnerComponent().getModel();
                return new Promise((resolve, reject)=>{
                    oModel.metadataLoaded().then(() => {
                        resolve(this.getDynamicColumns("VPODTLS", "ZDV_3DERP_VPDTLS"));
                        resolve(this.getDynamicColumns('VPODELSCHED','ZVB_VPO_DELSCHED'));
                        resolve(this.getDynamicColumns('VPODELINV','ZDV_3DERP_DELINV'));
                        resolve(this.getDynamicColumns('VPOHISTORY','ZDV_3DERP_POHIST'));
                        resolve(this.getDynamicColumns('VPOCOND','ZDV_3DERP_COND'));
                    });
                })

            },
            getDynamicColumns(model, dataSource) {
                var me = this;
                var modCode = model;
                var tabName = dataSource;
                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new JSONModel();
                //var vSBU = this.getView().getModel("ui").getData().sbu;
                var vSBU = this._sbu;

                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                // console.log(oModel)
                oModel.setHeaders({
                    sbu: vSBU,
                    type: modCode,
                    tabname: tabName
                });
                return new Promise((resolve, reject) => {
                    oModel.read("/ColumnsSet", {
                        success: async function (oData, oResponse) {
                            
                            if (oData.results.length > 0) {
                                me._columnLoadError = false;
                                if (modCode === 'VPODTLS') {
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VPODTLSColumnsVPODet");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                if (modCode === 'VPODELSCHED') {
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VPODELSCHEDColumnsVPODet");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                if (modCode === 'VPODELINV') {
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VPODELINVColumnsVPODet");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                if (modCode === 'VPOHISTORY') {
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VPOHISTORYColumnsVPODet");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                if (modCode === 'VPOCOND') {
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VPOCONDColumnsVPODet");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }

                            }else{
                                me._columnLoadError = true;
                                if (modCode === 'VPODTLS') {
                                    me.getView().setModel(oJSONColumnsModel, "VPODTLSColumnsVPODet");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                if (modCode === 'VPODELSCHED') {
                                    me.getView().setModel(oJSONColumnsModel, "VPODELSCHEDColumnsVPODet");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                if (modCode === 'VPODELINV') {
                                    me.getView().setModel(oJSONColumnsModel, "VPODELINVColumnsVPODet");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                if (modCode === 'VPOHISTORY') {
                                    me.getView().setModel(oJSONColumnsModel, "VPOHISTORYColumnsVPODet");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                if (modCode === 'VPOCOND') {
                                    me.getView().setModel(oJSONColumnsModel, "VPOCONDColumnsVPODet");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }

                            }
                        },
                        error: function (err) {
                            me._columnLoadError = true;
                            me.closeLoadingDialog(that);
                            resolve();
                        }
                    });
                })
            },
            setTableColumnsData(modCode){
                var me = this;
                var oColumnsModel;
                var oDataModel;

                var oColumnsData;
                var oData;
                
                if (modCode === 'VPODTLS') {
                    oColumnsModel = me.getView().getModel("VPODtlsVPODet");  
                    oDataModel = me.getView().getModel("VPODTLSColumnsVPODet"); 
                    
                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');

                    if(me._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');   
                    me.addColumns("vpoDetailsTab", oColumnsData, oData, "VPODtlsVPODet");
                }
                if (modCode === 'VPODELSCHED') {
                    oColumnsModel = me.getView().getModel("VPODelSchedVPODet");  
                    oDataModel = me.getView().getModel("VPODELSCHEDColumnsVPODet"); 
                    
                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');

                    if(me._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');   
                    me.addColumns("vpoDelSchedTab", oColumnsData, oData, "VPODelSchedVPODet");
                }
                if (modCode === 'VPODELINV') {
                    oColumnsModel = me.getView().getModel("VPODelInvVPODet");  
                    oDataModel = me.getView().getModel("VPODELINVColumnsVPODet"); 
                    
                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');

                    if(me._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');   
                    me.addColumns("vpoDelInvTab", oColumnsData, oData, "VPODelInvVPODet");
                }
                if (modCode === 'VPOHISTORY') {
                    oColumnsModel = me.getView().getModel("VPOPOHistVPODet");  
                    oDataModel = me.getView().getModel("VPOHISTORYColumnsVPODet"); 
                    
                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');

                    if(me._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');   
                    me.addColumns("vpoPoHistTab", oColumnsData, oData, "VPOPOHistVPODet");
                }
                if (modCode === 'VPOCOND') {
                    oColumnsModel = me.getView().getModel("VPOCondVPODet");  
                    oDataModel = me.getView().getModel("VPOCONDColumnsVPODet"); 
                    
                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');

                    if(me._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');   
                    me.addColumns("vpoConditionsTab", oColumnsData, oData, "VPOCondVPODet");
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
                            template: me.columnTemplate(sColumnId),
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
            
            loadReleaseStrategy: async function(){
                var me = this;
                var poNo = this._pono;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new sap.ui.model.json.JSONModel();
                var oView = this.getView();
                var relState = "";
                var relStateCount = 0

                this.showLoadingDialog('Loading...');

                //read Style header data
                
                var entitySet = "/VPORelStratSet(PONO='" + poNo + "')"
                oModel.read(entitySet, {
                    success: function (oData, oResponse) {
                        oData["expectedRel"] = "";
                        if (oData.REL1 !== "")
                            oData["expectedRel"] = oData["expectedRel"] + " " + oData.REL1;
                        
                        if (oData.REL2 !== "")
                            oData["expectedRel"] = oData["expectedRel"] + " " + oData.REL2;

                        if (oData.REL3 !== "")
                            oData["expectedRel"] = oData["expectedRel"] + " " + oData.REL3;

                        if (oData.REL4 !== "")
                            oData["expectedRel"] = oData["expectedRel"] + " " + oData.REL4;

                        if (oData.REL5 !== "")
                            oData["expectedRel"] = oData["expectedRel"] + " " + oData.REL5;

                        if (oData.REL6 !== "")
                            oData["expectedRel"] = oData["expectedRel"] + " " + oData.REL6;

                        if (oData.REL7 !== "")
                            oData["expectedRel"] = oData["expectedRel"] + " " + oData.REL7;

                        if (oData.REL8 !== "")
                            oData["expectedRel"] = oData["expectedRel"] + " " + oData.REL8;

                        if (oData.RELSTATE != "" || (oData.RELSTATE.match(/X/) || []).length){
                            relStateCount = (oData.RELSTATE.match(/X/g) || []).length;
                            if(relStateCount == 1 ){
                                relState = oData.REL1;
                            }
                            if(relStateCount == 2 ){
                                relState = oData.REL1 + " " + oData.REL2;
                            }
                            if(relStateCount == 3 ){
                                relState = oData.REL1 + " " + oData.REL2 + " " + oData.REL3;
                            }
                            if(relStateCount == 4 ){
                                relState = oData.REL1 + " " + oData.REL2 + " " + oData.REL3 + " " + oData.REL4;
                            }
                            if(relStateCount == 5 ){
                                relState = oData.REL1 + " " + oData.REL2 + " " + oData.REL3 + " " + oData.REL4 + " " + oData.REL5;
                            }
                            if(relStateCount == 6 ){
                                relState = oData.REL1 + " " + oData.REL2 + " " + oData.REL3 + " " + oData.REL4 + " " + oData.REL5 + " " + oData.REL6;
                            }
                            if(relStateCount == 7 ){
                                relState = oData.REL1 + " " + oData.REL2 + " " + oData.REL3 + " " + oData.REL4 + " " + oData.REL5 + " " + oData.REL6 + " " + oData.REL7;
                            }
                            if(relStateCount == 8 ){
                                relState = oData.REL1 + " " + oData.REL2 + " " + oData.REL3 + " " + oData.REL4 + " " + oData.REL5 + " " + oData.REL6 + " " + oData.REL7 + " " + oData.REL8;
                            }
                            oData["relState"] = relState;
                        }
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "relStratData");
                        me.closeLoadingDialog(that);
                        // me.setChangeStatus(false);
                    },
                    error: function (error) {
                        oView.setModel(oJSONModel, "relStratData");
                        me.closeLoadingDialog(that);
                    }
                })
            },

            remarksTblLoad(){
                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var oParam = {};
                var pono = this._pono
                var oJSONModel = new sap.ui.model.json.JSONModel();
                
                oParam = {
                    Client:     '888',
                    Id:         'F01',
                    Language:   'EN',
                    Name:       pono,
                    Object:     'EKKO',
                    N_Read_Text_Lines: [],
                };
                return new Promise((resolve, reject)=>{
                    oModel.create("/READ_TEXTSet", oParam, { 
                        method: "POST",
                        success: function(oResult, oResponse) {
                            if(oResult.N_Read_Text_Lines.results.length > 0){
                                oJSONModel.setData(oResult.N_Read_Text_Lines.results);
                                me.getView().setModel(oJSONModel, "remarksTblData");
                                me.remarksSetTblColData();
                                resolve();
                            }else{
                                me.getView().setModel(oJSONModel, "remarksTblData");
                                me.remarksSetTblColData();
                                resolve();
                            }
                        }
                    });
                })
                
            },
            pkngInstTblLoad(){
                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var oParam = {};
                var pono = this._pono
                var oJSONModel = new sap.ui.model.json.JSONModel();

                oParam = {
                    Client:     '888',
                    Id:         'F06',
                    Language:   'EN',
                    Name:       pono,
                    Object:     'EKKO',
                    N_Read_Text_Lines: [],
                };

                
                return new Promise((resolve, reject)=>{
                    oModel.create("/READ_TEXTSet", oParam, { 
                        method: "POST",
                        success: function(oResult, oResponse) {
                            if(oResult.N_Read_Text_Lines.results.length > 0){
                                oJSONModel.setData(oResult.N_Read_Text_Lines.results);
                                me.getView().setModel(oJSONModel, "pkngInstTblData");
                                me.pkngInstSetTblColData();
                                resolve();
                            }else{
                                me.getView().setModel(oJSONModel, "pkngInstTblData");
                                me.pkngInstSetTblColData();
                                resolve();
                            }
                        }
                    });
                })
            },

            hdrTextLoadCol: async function(){
                var sbu = this._sbu;

                var oJSONColumnsModel = new JSONModel();
                var oJSONColumnsModel2 = new JSONModel();


                var remColumn = [{
                    ColumnLabel:    "Item",
                    ColumnName:     "Tdformat",
                    ColumnType:     "STRING",
                    ColumnWidth:    100,
                    Creatable:      false,
                    DataType:       "STRING",
                    Decimal:        0,
                    DictType:       "",
                    Editable:       false,
                    Key:            "X",
                    Length:         3,
                    Mandatory:      false,
                    Order:          "1 ",
                    Pivot:          "",
                    SortOrder:      "Ascending",
                    SortSeq:        "1 ",
                    Sorted:         false,
                    Visible:        true,
                    
                }, {
                    ColumnLabel:    "Remarks",
                    ColumnName:     "Tdline",
                    ColumnType:     "STRING",
                    ColumnWidth:    300,
                    Creatable:      false,
                    DataType:       "STRING",
                    Decimal:        0,
                    DictType:       "",
                    Editable:       true,
                    Key:            "X",
                    Length:         300,
                    Mandatory:      true,
                    Order:          "1 ",
                    Pivot:          "",
                    SortOrder:      "Ascending",
                    SortSeq:        "1 ",
                    Sorted:         false,
                    Visible:        true,
                }];

                var pkngInstColumn = [{
                    ColumnLabel:    "Item",
                    ColumnName:     "Tdformat",
                    ColumnType:     "STRING",
                    ColumnWidth:    100,
                    Creatable:      false,
                    DataType:       "STRING",
                    Decimal:        0,
                    DictType:       "",
                    Editable:       false,
                    Key:            "X",
                    Length:         3,
                    Mandatory:      false,
                    Order:          "1 ",
                    Pivot:          "",
                    SortOrder:      "Ascending",
                    SortSeq:        "1 ",
                    Sorted:         false,
                    Visible:        true,
                    
                }, {
                    ColumnLabel:    "Packing Instructions",
                    ColumnName:     "Tdline",
                    ColumnType:     "STRING",
                    ColumnWidth:    300,
                    Creatable:      false,
                    DataType:       "STRING",
                    Decimal:        0,
                    DictType:       "",
                    Editable:       true,
                    Key:            "X",
                    Length:         300,
                    Mandatory:      true,
                    Order:          "1 ",
                    Pivot:          "",
                    SortOrder:      "Ascending",
                    SortSeq:        "1 ",
                    Sorted:         false,
                    Visible:        true,
                }];

                oJSONColumnsModel.setData(remColumn);
                this.getView().setModel(oJSONColumnsModel, "VPORemarksCol");

                oJSONColumnsModel2.setData(pkngInstColumn);
                this.getView().setModel(oJSONColumnsModel2, "VPOPkngInstsCol");

                // var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                // oModel.setHeaders({
                //     sbu: sbu,
                //     type: "VPOREMARKS",
                //     tabname: ""
                // });

                // oModel.read("/ColumnsSet", {
                //     success: async function (oData, oResponse) {
                //         console.log(oData);
                //     }
                // });
            },

            remarksSetTblColData(){
                var oColumnsModel;
                var oDataModel;

                var oColumnsData;
                var oData;
                
                var oModel = new JSONModel();
                
                oColumnsModel = this.getView().getModel("VPORemarksCol");  
                oDataModel = this.getView().getModel("remarksTblData"); 

                oColumnsData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/');
                oData = oDataModel === undefined ? [] :oDataModel.getProperty('/');

                oModel.setData({
                    columns: oColumnsData,
                    rows: oData
                });
                
                var oTable = this.getView().byId("RemarksTbl");
                
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
                            id: "VPORemarksCol"+"-"+sColumnId,
                            label: sColumnLabel,
                            template: new sap.m.Text({ text: "{" + sColumnId + "}", wrapping: false, tooltip: "{" + sColumnId + "}" }), //default text
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
                            id: "VPORemarksCol"+"-"+sColumnId,
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
                            id: "VPORemarksCol"+"-"+sColumnId,
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
            pkngInstSetTblColData(){
                var oColumnsModel;
                var oDataModel;

                var oColumnsData;
                var oData;
                
                var oModel = new JSONModel();
                
                oColumnsModel = this.getView().getModel("VPOPkngInstsCol");  
                oDataModel = this.getView().getModel("pkngInstTblData"); 

                oColumnsData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/');
                oData = oDataModel === undefined ? [] :oDataModel.getProperty('/');

                oModel.setData({
                    columns: oColumnsData,
                    rows: oData
                });
                
                var oTable = this.getView().byId("PackingInstTbl");
                
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
                            id: "VPOPkngInstsCol"+"-"+sColumnId,
                            label: sColumnLabel,
                            template: new sap.m.Text({ text: "{" + sColumnId + "}", wrapping: false, tooltip: "{" + sColumnId + "}" }), //default text
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
                            id: "VPOPkngInstsCol"+"-"+sColumnId,
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
                            id: "VPOPkngInstsCol"+"-"+sColumnId,
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

            validatePOChange: async function(){

                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var oEntitySet = "/ValidatePO_ChangeSet"

                _promiseResult = new Promise((resolve, reject)=>{
                    oModel.read(oEntitySet, {
                        urlParameters: {
                            "$filter":"PO_Number eq '"+ this._pono +"'"
                        },
                        success: async function (data, response) {
                            if(data.results.WithGR != "X"){
                                me._validPOChange = 1
                                resolve()
                            }else{
                                me._validPOChange = 0
                                resolve()
                            }
                        },
                        error: function(error){
                            me._validPOChange = 2
                            resolve()
                        }
                    })
                })
                await _promiseResult;
            },

            onEditVPOHeader: async function(){
                var me = this;
                var oView = this.getView();
                var edditableFields = [];
                var oJSONEdit = new sap.ui.model.json.JSONModel();
                var oDataEDitModel = this.getView().getModel("topHeaderDataEdit"); 
                var oDataEdit = oDataEDitModel.getProperty('/');

                // console.log(this.getView().getModel("VPODtlsVPODet").getProperty("/results"));

                // this.getView().getModel("VPODtlsVPODet").getProperty("/results").forEach(item => {
                //     console.log(item);
                //     if(item.DELETED || item.CLOSED){
                //         MessageBox.information("PO ")
                //     }
                // })
    
                oDataEdit.SHIPTOPLANT = true;//ShipToPlant
                oDataEdit.PAYMNTTERMS = true;//Payment Terms
                oDataEdit.INCOTERMS = true;//IncoTerms
                oDataEdit.DEST = true;//Destination

                oJSONEdit.setData(oDataEdit);
                
                this.byId("vpoBtnEditHeader").setVisible(false);
                this.byId("vpoBtnRefreshtHeader").setVisible(false);
                this.byId("vpoBtnSaveHeader").setVisible(true);
                this.byId("vpoBtnCancelHeader").setVisible(true);
                oView.setModel(oJSONEdit, "topHeaderDataEdit");
            },

            onHeaderInputChange: async function(oEvent){
                console.log(oEvent.getParameters().selectedItem.mProperties.key);
                var textValue = oEvent.getParameters().selectedItem.mProperties.key;

                var oStatusText = this.getView().byId("CVDNewVendor");
                console.log(oStatusText);
                oStatusText.setText(textValue);


                console.log(oEvent.getSource().getBindingInfo("value").binding.oValue);
                console.log(oEvent.getSource().getBindingInfo("value").mandatory);
            },

            onSaveVPOHeader: async function(){
                var me = this;
                this.showLoadingDialog('Loading...')
                var oView = this.getView();
                var edditableFields = [];
                var oJSONEdit = new sap.ui.model.json.JSONModel();
                var oDataEDitModel = this.getView().getModel("topHeaderDataEdit"); 
                var oDataEdit = oDataEDitModel.getProperty('/');

                var oParamInitParam = {}
                var oParamDataPO = [];
                var oParamDataPOClose = [];
                var oParam = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");

                var message;

                var oTmpSelectedIndices = [];
                var oTable = this.byId("vpoDetailsTab");
                var oSelectedIndices = oTable.getBinding("rows").aIndices;
                var aData = oTable.getModel().getData().rows;

                var shipToPlant = this.byId("f1ShipToPlant").getSelectedKey();
                var incoTerms = this.byId("f1Incoterms").getSelectedKey();
                var destination = this.byId("f1Destination").getValue();

                var validPOItem

                oSelectedIndices.forEach(item => {
                    oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                })
                oSelectedIndices = oTmpSelectedIndices;

                oSelectedIndices.forEach((item, index) => {
                    if (aData.at(item).DELETED === false) {
                        validPOItem = item;
                    }
                });
                oParamInitParam = {
                    IPoNumber: me._pono,
                    IDoDownload: "N",
                    IChangeonlyHdrplants: "N",
                }
                oParamDataPO.push({
                    Banfn: aData.at(validPOItem).PRNO, //PRNO
                    Bnfpo: aData.at(validPOItem).PRITM, //PRITM
                    Ebeln: this._pono,//pono
                    Unsez: shipToPlant, //shipToPlant
                    Inco1: incoTerms, // Incoterms
                    Inco2: destination, //Destination
                    Ebelp: aData.at(validPOItem).ITEM,//poitem
                    Txz01: aData.at(validPOItem).SHORTTEXT,//shorttext
                    Menge: aData.at(validPOItem).QTY,//QTY
                    Meins: aData.at(validPOItem).UOM,//UOM
                    Netpr: aData.at(validPOItem).NETPRICE,//net price
                    Peinh: aData.at(validPOItem).PER,//PER
                    Bprme: aData.at(validPOItem).ORDERPRICEUOM, //Order Price Unit
                    Repos: aData.at(validPOItem).INVRCPTIND, //IR Indicator
                    Webre: aData.at(validPOItem).GRBASEDIVIND, //GR Based Ind
                    Eindt: sapDateFormat.format(new Date(aData.at(validPOItem).DELDT)) + "T00:00:00", //DlvDt
                    Uebtk: aData.at(validPOItem).UNLIMITED,//Unlimited
                    Uebto: aData.at(validPOItem).OVERDELTOL,//OverDel Tol.
                    Untto: aData.at(validPOItem).UNDERDELTOL,//UnderDel Tol.
                    Zzmakt: aData.at(validPOItem).POADDTLDESC, //PO Addtl Desc
                    Elikz: aData.at(validPOItem).CLOSED, //Closed
                    // Delete_Rec: aData.at(item).DELETED//Delete
                    
                });
                oParamDataPOClose.push({
                    Banfn: aData.at(validPOItem).PRNO, //PRNO
                    Bnfpo: aData.at(validPOItem).PRITM, //PRITM
                    Ebakz: "" 
                })
                if (oParamDataPO.length > 0) {
                    oParam = oParamInitParam;
                    oParam['N_ChangePOItemParam'] = oParamDataPO;
                    oParam['N_ChangePOClosePRParam'] = oParamDataPOClose;
                    oParam['N_ChangePOReturn'] = [];

                    _promiseResult = new Promise((resolve, reject)=>{
                        oModel.create("/ChangePOSet", oParam, {
                            method: "POST",
                            success: function(oData, oResponse){
                                if(oData.N_ChangePOReturn.results.length > 0){
                                    message = oData.N_ChangePOReturn.results[0].Msgv1;
                                    MessageBox.information(message);
                                    resolve()
                                }else{
                                    MessageBox.information("No Details to be saved.");
                                    resolve()
                                }
                            },error: function(error){
                                MessageBox.error(error);
                                resolve()
                            }
                        })
                    });
                    await _promiseResult;
                }


                for (var oDatas in oDataEdit) {
                    //get only editable fields
                    edditableFields[oDatas] = false;
                }
                oJSONEdit.setData(edditableFields);
                this.byId("vpoBtnEditHeader").setVisible(true);
                this.byId("vpoBtnRefreshtHeader").setVisible(true);
                this.byId("vpoBtnSaveHeader").setVisible(false);
                this.byId("vpoBtnCancelHeader").setVisible(false);
                oView.setModel(oJSONEdit, "topHeaderDataEdit");
                this.loadAllData()

                this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                this.closeLoadingDialog(that);
            },

            onCancelVPOHeader: async function(){
                var me = this;
                var oView = this.getView();
                var edditableFields = [];
                var oJSONEdit = new sap.ui.model.json.JSONModel();
                var oDataEDitModel = this.getView().getModel("topHeaderDataEdit"); 
                var oDataEdit = oDataEDitModel.getProperty('/');


                
                for (var oDatas in oDataEdit) {
                    //get only editable fields
                    edditableFields[oDatas] = false;
                }
                oJSONEdit.setData(edditableFields);
                this.byId("vpoBtnEditHeader").setVisible(true);
                this.byId("vpoBtnRefreshtHeader").setVisible(true);
                this.byId("vpoBtnSaveHeader").setVisible(false);
                this.byId("vpoBtnCancelHeader").setVisible(false);
                this.loadAllData();
                oView.setModel(oJSONEdit, "topHeaderDataEdit");
            },

            onChangeVendorVPOHeader: async function(){
                MessageToast.show("Changed CLick");
                var me = this;
                var oJSONModel = new JSONModel();
                var vendorSelJSONModel = new JSONModel();
                
                var poNo = this._pono
                var oModel = this.getOwnerComponent().getModel();
                var rfcModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var bProceed = true;

                this._purchOrg = "";
                this._vendorCd = "";
                

                var changeVendorData = {};

                _promiseResult = new Promise((resolve, reject)=>{
                    oModel.read("/mainSet(PONO='" + poNo + "')", {
                        success: function (oData, oResponse) {
                            // if (oData.PODT !== null)
                            //     oData.PODT = dateFormat.format(new Date(oData.PODT));
                            me._vendorCd = oData.VENDOR;
                            me._purchOrg = oData.PURCHORG;
                            me._purchGrp = oData.PURCHGRP;
                            resolve();
                        },
                        error: function () {
                            bProceed = false;
                            resolve();
                        }
                    });
                });

                await _promiseResult;

                if(this._vendorCd === undefined ||  this._vendorCd === ""){
                    bProceed = false;
                }
                if(this._purchOrg === undefined ||  this._purchOrg === ""){
                    bProceed = false;
                }

                if(bProceed){
                    oModel.read("/VPOVendorSelRscSet",{ 
                        urlParameters: {
                            "$filter": "PURORG eq '" + this._purchOrg + "'"
                        },
                        success: function (oData, oResponse) {
                            // if (oData.PODT !== null)
                            //     oData.PODT = dateFormat.format(new Date(oData.PODT));
                            oJSONModel.setData(oData.results);
                            me.getView().setModel(oJSONModel, "VendorPOSelect");

                            changeVendorData = {
                                Title: "Change Vendor",
                                POLabel: "Purchase Order",
                                CurrVendorLabel: "Current Vendor",
                                NewVendorLabel: "New Vendor",
                                PONO: poNo,
                                CURRVENDOR: me._vendorCd,
                                NEWVENDOR: "",
                            }

                            vendorSelJSONModel.setData(changeVendorData);

                            me.changeVendorDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.ChangeVendorDialog", me);
                            me.changeVendorDialog.setModel(vendorSelJSONModel);
                            me.getView().addDependent(me.changeVendorDialog);
                            me.changeVendorDialog.open();
                        },
                        error: function () {
                        }
                    });
                }
            },
            onSaveVendorVPOHeader: async function(oEvent){
                var me = this;
                var poNo = this._pono
                var oModel = this.getOwnerComponent().getModel();
                var rfcModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                // /VPOVendorMatRscSet
                var material; 
                var newVendorCd = this._newVendorCd;
                var bProceed = true;


                var vendorCd = this._vendorCd;
                var purchOrg = this._purchOrg;
                var purchGrp = this._purchGrp;
                
                var oParam = {};
                var importParam = [];
                console.log(purchGrp);

                _promiseResult = new Promise((resolve, reject)=>{
                    oModel.read("/VPOVendorMatRscSet",{
                    urlParameters: {
                        "$filter": "PONO eq '" + poNo + "'"
                    }, 
                        success: function (oData, oResponse) {
                            // if (oData.PODT !== null)
                            //     oData.PODT = dateFormat.format(new Date(oData.PODT));
                            if(oData.results.length > 0){
                                material = oData.results[0].MATNO;
                            }
                            resolve();
                        },
                        error: function () {
                            bProceed = false;
                            resolve();
                        }
                    });
                });
                await _promiseResult;

                if(bProceed){
                    importParam.push({
                        Vendor: vendorCd,
                        Material: material,
                        PurchOrg: purchOrg,
                        Plant: "",
                        PurGroup: purchGrp
                    });

                    if(importParam.length > 0){
                        oParam["N_GetInfoRecMatParam"] = importParam;
                        
                        console.log(oParam);
                        _promiseResult = new Promise((resolve, reject)=>{
                            oModel.create("/GetInfoRecordSet", oParam, {
                                method: "POST",
                                success: function(oData, oResponse) {
                                    console.log(oData)
                                },
                                error: function(err){

                                }
                            });
                        });
                        await _promiseResult;
                    }
                }
            },
            onCancelVendorDialog: async function(){
                this.changeVendorDialog.destroy(true);
            },
            onComboBoxVendorChange: async function(oEvent){
                var textValue = oEvent.getParameter("selectedItem").getKey();
                this._newVendorCd = textValue;
            },

            onChangeVPODelvDate: async function(){
                var me = this;

                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
                    MessageBox.information("Delivery Date cannot be changed.")
                    return;
                }

                var poNo = this._pono;

                var changeDlvDate = {};
                var changeDlvDateModel = new JSONModel();

                changeDlvDate = {
                    Title: "Change Delivery Date",
                    POLabel: "Purchase Order",
                    NewDlvDateLabel: "New Vendor",
                    PONO: poNo,
                    NewDlvDate: ""
                };
                
                changeDlvDateModel.setData(changeDlvDate);
                this.changeDlvDateDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.ChangeDlvDateDialog", me);
                this.changeDlvDateDialog.setModel(changeDlvDateModel);
                this.getView().addDependent(this.changeDlvDateDialog);
                this.changeDlvDateDialog.open();
            },
            onCancelChangeVPODelvDate: async function(){
                this.changeDlvDateDialog.destroy(true);
            },
            onSaveChangeVPODelvDate: async function(){
                var me = this;
                
                this.showLoadingDialog('Loading...')
                var oView = this.getView();

                var oParamInitParam = {}
                var oParamDataPO = [];
                var oParamDataPOClose = [];
                var oParam = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");

                var message;

                var oTmpSelectedIndices = [];
                var oTable = this.byId("vpoDetailsTab");
                var oSelectedIndices = oTable.getBinding("rows").aIndices;
                var aData = oTable.getModel().getData().rows;

                var validPOItem

                oSelectedIndices.forEach(item => {
                    oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                })
                oSelectedIndices = oTmpSelectedIndices;

                oSelectedIndices.forEach((item, index) => {
                    if (aData.at(item).DELETED === false) {
                        validPOItem = item;
                    }
                });

                oParamInitParam = {
                    IPoNumber: me._pono,
                    IDoDownload: "N",
                    IChangeonlyHdrplants: "N",
                }
                oParamDataPO.push({
                    Banfn: aData.at(validPOItem).PRNO, //PRNO
                    Bnfpo: aData.at(validPOItem).PRITM, //PRITM
                    Ebeln: this._pono,//pono
                    Ebelp: aData.at(validPOItem).ITEM,//poitem
                    Txz01: aData.at(validPOItem).SHORTTEXT,//shorttext
                    Menge: aData.at(validPOItem).QTY,//QTY
                    Meins: aData.at(validPOItem).UOM,//UOM
                    Netpr: aData.at(validPOItem).NETPRICE,//net price
                    Peinh: aData.at(validPOItem).PER,//PER
                    Bprme: aData.at(validPOItem).ORDERPRICEUOM, //Order Price Unit
                    Repos: aData.at(validPOItem).INVRCPTIND, //IR Indicator
                    Webre: aData.at(validPOItem).GRBASEDIVIND, //GR Based Ind
                    Eindt: sapDateFormat.format(new Date(this._newDlvDate)) + "T00:00:00", //DlvDt
                    Uebtk: aData.at(validPOItem).UNLIMITED,//Unlimited
                    Uebto: aData.at(validPOItem).OVERDELTOL,//OverDel Tol.
                    Untto: aData.at(validPOItem).UNDERDELTOL,//UnderDel Tol.
                    Zzmakt: aData.at(validPOItem).POADDTLDESC, //PO Addtl Desc
                    Elikz: aData.at(validPOItem).CLOSED, //Closed
                    // Delete_Rec: aData.at(item).DELETED//Delete
                });
                oParamDataPOClose.push({
                    Banfn: aData.at(validPOItem).PRNO, //PRNO
                    Bnfpo: aData.at(validPOItem).PRITM, //PRITM
                    Ebakz: "" 
                });

                if (oParamDataPO.length > 0) {
                    oParam = oParamInitParam;
                    oParam['N_ChangePOItemParam'] = oParamDataPO;
                    oParam['N_ChangePOClosePRParam'] = oParamDataPOClose;
                    oParam['N_ChangePOReturn'] = [];

                    _promiseResult = new Promise((resolve, reject)=>{
                        oModel.create("/ChangePOSet", oParam, {
                            method: "POST",
                            success: function(oData, oResponse){
                                if(oData.N_ChangePOReturn.results.length > 0){
                                    console.log(oData.N_ChangePOReturn);
                                    if(oData.N_ChangePOReturn.results[0].Msgtyp === "E"){
                                        message = oData.N_ChangePOReturn.results[0].Msgv1;
                                        MessageBox.information(message);
                                        resolve()
                                    }else{
                                        me.changeDlvDateDialog.destroy(true);
                                        message = oData.N_ChangePOReturn.results[0].Msgv1;
                                        MessageBox.information(message);
                                        resolve()
                                    }
                                }else{
                                    MessageBox.information("No Details to be saved.");
                                    resolve()
                                }
                            },error: function(error){
                                MessageBox.error(error);
                                resolve()
                            }
                        })
                    });
                    await _promiseResult;

                    this.loadAllData()

                    this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                    this.closeLoadingDialog(that);
                }
            },
            onDatePickVPODelvDateChange: async function(oEvent){
                this._newDlvDate = oEvent.getParameter("value");
			    // var bValid = oEvent.getParameter("valid");
                // console.log(this._newDlvDate);
                // console.log(sValue);
                // console.log(bValid);
            },
            
            onEditPODtls: async function(){
                // if(this.getView().getModel("ui").getData().dataMode === 'EDIT'){
                //     return;
                // }
                // if(this.getView().getModel("ui").getData().dataMode === 'NODATA'){
                //     return;
                // }
                // this.showLoadingDialog('Loading...');
                
                var me = this;
                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
                    MessageBox.information("PO is not editable.")
                    return;
                }
                var oModel = this.getOwnerComponent().getModel();
                var oEntitySet = "/VPODetailsSet";

                var poNo;
                var oTable = this.byId("vpoDetailsTab");
                var aSelIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];

                var aData = this._oDataBeforeChange.results != undefined? this._oDataBeforeChange.results : this.getView().getModel("VPODtlsVPODet").getData().results;
                var aDataToEdit = [];
                var iCounter = 0;

                if (aSelIndices.length > 0) {
                    aSelIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    });

                    aSelIndices = oTmpSelectedIndices;

                    aSelIndices.forEach((item, index) => {
                        //Validation
                        //Entity
                        poNo = aData.at(item).PONO

                        oModel.read(oEntitySet, {
                            urlParameters: {
                                "$filter": "PONO eq '" + poNo + "'"
                            },
                            success: async function (data, response) {
                                data.results.forEach(dataItem => {
                                    if(aData.at(item).ITEM == dataItem.ITEM){
                                        iCounter++;
                                        aDataToEdit.push(aData.at(item));
                                        if (aSelIndices.length === iCounter) {
                                            me._oDataBeforeChange = me.getView().getModel("VPODtlsVPODet").getData();
                                            me.getView().getModel("VPODtlsVPODet").setProperty("/results", aDataToEdit);
                                            me.setTableColumnsData("VPODTLS");
                                            me.byId("vpoSearchFieldDetails").setVisible(false);
                                            me.byId("vpoBtnAddPRtoPO").setVisible(false);
                                            me.byId("vpoBtnItemChanges").setVisible(false);
                                            me.byId("vpoBtnRefreshDetails").setVisible(false);
                                            me.byId("vpoBtnEditDetails").setVisible(false);
                                            me.byId("vpoBtnDeleteDetails").setVisible(false);
                                            me.byId("vpoBtnColPropDetails").setVisible(false);
                                            me.byId("vpoBtnSaveDetails").setVisible(true);
                                            me.byId("vpoBtnCancelDetails").setVisible(true);
                                            
                                            
                                            me.onRowEditPO("vpoDetailsTab", "VPODTLSColumnsVPODet");
                                            
                                            me.getView().getModel("ui").setProperty("/dataMode", 'EDIT');
                                            
                                        }
                                    }
                                    
                                    
                                });
                                
                            },error: function(error){
    
                            }
                        });
                    });
                    
                }

            },
            onRowEditPO: async function(table, model){
                var me = this;
                // this.getView().getModel(model).getData().results.forEach(item => item.Edited = false);
                var oTable = this.byId(table);

                var oColumnsModel = this.getView().getModel(model);
                var oColumnsData = oColumnsModel.getProperty('/');

                oTable.getColumns().forEach((col, idx) => {
                    oColumnsData.filter(item => item.ColumnName === col.sId.split("-")[1])
                        .forEach(ci => {
                            var sColumnType = ci.DataType;
                            if (ci.Editable) {
                                if (ci.ColumnName === "UNLIMITED") {
                                    col.setTemplate(new sap.m.CheckBox({
                                        selected: "{" + ci.ColumnName + "}",
                                        editable: true,
                                        // liveChange: this.onInputLiveChange.bind(this)
                                    }));
                                }else if (sColumnType === "STRING") {
                                    col.setTemplate(new sap.m.Input({
                                        // id: "ipt" + ci.name,
                                        type: "Text",
                                        value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                        maxLength: +ci.Length,
                                        liveChange: this.onInputLiveChange.bind(this)
                                    }));
                                }else if (sColumnType === "DATETIME"){
                                    col.setTemplate(new sap.m.DatePicker({
                                        // id: "ipt" + ci.name,
                                        value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                        displayFormat:"short",
                                        change:"handleChange",
                                    
                                        liveChange: this.onInputLiveChange.bind(this)
                                    }));
                                }else if (sColumnType === "NUMBER"){
                                    col.setTemplate(new sap.m.Input({
                                        // id: "ipt" + ci.name,
                                        type: sap.m.InputType.Number,
                                        value: "{path:'" + ci.ColumnName + "', type:'sap.ui.model.type.Decimal', formatOptions:{ minFractionDigits:" + null + ", maxFractionDigits:" + null + " }, constraints:{ precision:" + ci.Decimal + ", scale:" + null + " }}",
                                        
                                        maxLength: +ci.Length,
                                    
                                        liveChange: this.onNumberLiveChange.bind(this)
                                    }));
                                }
                            }
                        });
                });
            },
            onInputLiveChange: function(oEvent){
                if(oEvent.getSource().getBindingInfo("value").mandatory){
                    if(oEvent.getParameters().value === ""){
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Required Field");
                        this.validationErrors.push(oEvent.getSource().getId());
                    }else{
                        oEvent.getSource().setValueState("None");
                        this.validationErrors.forEach((item, index) => {
                            if (item === oEvent.getSource().getId()) {
                                this.validationErrors.splice(index, 1)
                            }
                        })
                    }
                }
                if(oEvent.getParameters().value === oEvent.getSource().getBindingInfo("value").binding.oValue){
                    this._isEdited = false;
                }else{
                    this._isEdited = true;
                }

            },
            onNumberLiveChange: function(oEvent){
                if(oEvent.getSource().getBindingInfo("value").mandatory){
                    if(oEvent.getParameters().value === ""){
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Required Field");
                        this.validationErrors.push(oEvent.getSource().getId());
                    }else{
                        oEvent.getSource().setValueState("None");
                        this.validationErrors.forEach((item, index) => {
                            if (item === oEvent.getSource().getId()) {
                                this.validationErrors.splice(index, 1)
                            }
                        })
                    }
                }
            },
            onSaveEditPODtls: async function(){
                var me = this;
                // if(this.getView().getModel("ui").getData().dataMode != 'EDIT'){
                //     return;
                // }
                this.showLoadingDialog('Loading...')
                var oTable = this.byId("vpoDetailsTab");
                var oSelectedIndices = oTable.getBinding("rows").aIndices;
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;
                var oParamInitParam = {}
                var oParamDataPO = [];
                var oParamDataPOClose = [];
                var oParam = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                
                var message;

                console.log(aData);
                oSelectedIndices.forEach(item => {
                    oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                })
                oSelectedIndices = oTmpSelectedIndices;
                oSelectedIndices.forEach((item, index) => {
                    oParamInitParam = {
                        IPoNumber: me._pono,
                        IDoDownload: "N",
                        IChangeonlyHdrplants: "N",
                    }
                    oParamDataPO.push({
                        Banfn: aData.at(item).PRNO, //PRNO
                        Bnfpo: aData.at(item).PRITM, //PRITM
                        Ebeln: me._pono,//pono
                        Ebelp: aData.at(item).ITEM,//poitem
                        Txz01: aData.at(item).SHORTTEXT,//shorttext
                        Menge: aData.at(item).QTY,//QTY
                        Meins: aData.at(item).UOM,//UOM
                        Netpr: aData.at(item).NETPRICE,//net price
                        Peinh: aData.at(item).PER,//PER
                        Bprme: aData.at(item).ORDERPRICEUOM, //Order Price Unit
                        Repos: aData.at(item).INVRCPTIND, //IR Indicator
                        Webre: aData.at(item).GRBASEDIVIND, //GR Based Ind
                        Eindt: sapDateFormat.format(new Date(aData.at(item).DELDT)) + "T00:00:00", //DlvDt
                        Uebtk: aData.at(item).UNLIMITED,//Unlimited
                        Uebto: aData.at(item).OVERDELTOL,//OverDel Tol.
                        Untto: aData.at(item).UNDERDELTOL,//UnderDel Tol.
                        Zzmakt: aData.at(item).POADDTLDESC, //PO Addtl Desc
                        Elikz: aData.at(item).CLOSED, //Closed
                        // Delete_Rec: aData.at(item).DELETED//Delete
                        
                    });
                    oParamDataPOClose.push({
                        Banfn: aData.at(item).PRNO, //PRNO
                        Bnfpo: aData.at(item).PRITM, //PRITM
                        Ebakz: "" 
                    })
                });

                if (oParamDataPO.length > 0) {
                    oParam = oParamInitParam;
                    oParam['N_ChangePOItemParam'] = oParamDataPO;
                    oParam['N_ChangePOClosePRParam'] = oParamDataPOClose;
                    oParam['N_ChangePOReturn'] = [];
                    console.log(oParam);
                    _promiseResult = new Promise((resolve, reject)=>{
                        oModel.create("/ChangePOSet", oParam, {
                            method: "POST",
                            success: function(oData, oResponse){
                                if(oData.N_ChangePOReturn.results.length > 0){
                                    message = oData.N_ChangePOReturn.results[0].Msgv1;
                                    MessageBox.information(message);
                                    resolve()
                                }else{
                                    MessageBox.information("No Details to be saved.");
                                }
                            },error: function(error){
                                MessageBox.error(error);
                            }
                        })
                    });
                    await _promiseResult;
                }

                _promiseResult = new Promise((resolve, reject)=>{
                    me.byId("vpoSearchFieldDetails").setVisible(true)
                    me.byId("vpoBtnAddPRtoPO").setVisible(true)
                    me.byId("vpoBtnItemChanges").setVisible(true)
                    me.byId("vpoBtnRefreshDetails").setVisible(true)
                    me.byId("vpoBtnEditDetails").setVisible(true)
                    me.byId("vpoBtnDeleteDetails").setVisible(true)
                    me.byId("vpoBtnColPropDetails").setVisible(true)
                    me.byId("vpoBtnSaveDetails").setVisible(false)
                    me.byId("vpoBtnCancelDetails").setVisible(false)
                    me.loadAllData()
                    resolve()
                });
                await _promiseResult;
                // if (this.getView().getModel("ui").getData().dataMode === 'NEW') this.setFilterAfterCreate();

                this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                this.closeLoadingDialog(that);

            },
            onCancelEditPODtls: async function(){
                var me = this;
                if (this._isEdited) {

                    if (!this._DiscardChangesDialog) {
                        this._DiscardChangesDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.DiscardChangesDialog", this);
                        this.getView().addDependent(this._DiscardChangesDialog);
                    }
                    this._DiscardChangesDialog.open();
                }else{
                    this.showLoadingDialog('Loading...');
                    this.byId("vpoSearchFieldDetails").setVisible(true);
                    this.byId("vpoBtnAddPRtoPO").setVisible(true);
                    this.byId("vpoBtnItemChanges").setVisible(true);
                    this.byId("vpoBtnRefreshDetails").setVisible(true);
                    this.byId("vpoBtnEditDetails").setVisible(true);
                    this.byId("vpoBtnDeleteDetails").setVisible(true);
                    this.byId("vpoBtnColPropDetails").setVisible(true);
                    this.byId("vpoBtnSaveDetails").setVisible(false);
                    this.byId("vpoBtnCancelDetails").setVisible(false);
                    this.validationErrors = [];

                    _promiseResult = new Promise((resolve, reject)=>{
                        setTimeout(() => {
                            me.loadAllData();
                            resolve();
                        }, 500);
                    });
                    await _promiseResult;
                    // if (this.getView().getModel("ui").getData().dataMode === 'NEW') this.setFilterAfterCreate();

                    this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                    this.closeLoadingDialog(that);
                }
            },
            onCloseDiscardChangesDialog: async function(){
                var me = this;
                if (this._isEdited) {
                    this._DiscardChangesDialog.close();
                    this.showLoadingDialog('Loading...');
                    this.byId("vpoSearchFieldDetails").setVisible(true);
                    this.byId("vpoBtnAddPRtoPO").setVisible(true);
                    this.byId("vpoBtnItemChanges").setVisible(true);
                    this.byId("vpoBtnRefreshDetails").setVisible(true);
                    this.byId("vpoBtnEditDetails").setVisible(true);
                    this.byId("vpoBtnDeleteDetails").setVisible(true);
                    this.byId("vpoBtnColPropDetails").setVisible(true);
                    this.byId("vpoBtnSaveDetails").setVisible(false);
                    this.byId("vpoBtnCancelDetails").setVisible(false);

                    // this.getView().getModel("TableData").setProperty("/", this._oDataBeforeChange);
                    _promiseResult = new Promise((resolve, reject)=>{
                        setTimeout(() => {
                            me.loadAllData();
                            resolve();
                        }, 1000);
                    });
                    await _promiseResult;
                    this.closeLoadingDialog(that);
                }
                this.validationErrors = [];
                this._DiscardChangesDialog.close();
                this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                this._isEdited = false;

            },
            onCancelDiscardChangesDialog: async function(){
                this._DiscardChangesDialog.close();
            },
            onDeletePODtls: async function(){
                var me = this;
                var bProceed = true;
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
                    MessageBox.information("PO is not deletable.")
                    bProceed = false;
                }
                this.getView().getModel("VPODtlsVPODet").getProperty("/results").forEach(item => {
                    if(item.DELETED || item.CLOSED){
                        MessageBox.information("PO is already Closed or Deleted.")
                        bProceed = false;
                    }
                });
                if(bProceed){
                    this.showLoadingDialog('Loading...')
                    var oTable = this.byId("vpoDetailsTab");
                    var oSelectedIndices = oTable.getSelectedIndices();
                    var oTmpSelectedIndices = [];
                    var aData = oTable.getModel().getData().rows;
                    var oParamInitParam = {}
                    var oParamDataPO = [];
                    var oParamDataPOClose = [];
                    var oParam = {};
                    var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");

                    var message;

                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })
                    oSelectedIndices = oTmpSelectedIndices;
                    oSelectedIndices.forEach((item, index) => {
                        oParamInitParam = {
                            IPoNumber: me._pono,
                            IDoDownload: "N",
                            IChangeonlyHdrplants: "N",
                        }
                        oParamDataPO.push({
                            Banfn: aData.at(item).PRNO, //PRNO
                            Bnfpo: aData.at(item).PRITM, //PRITM
                            Ebeln: me._pono,//pono
                            Ebelp: aData.at(item).ITEM,//poitem
                            Txz01: aData.at(item).SHORTTEXT,//shorttext
                            Menge: aData.at(item).QTY,//QTY
                            Meins: aData.at(item).UOM,//UOM
                            Netpr: aData.at(item).NETPRICE,//net price
                            Peinh: aData.at(item).PER,//PER
                            Bprme: aData.at(item).ORDERPRICEUOM, //Order Price Unit
                            Repos: aData.at(item).INVRCPTIND, //IR Indicator
                            Webre: aData.at(item).GRBASEDIVIND, //GR Based Ind
                            Eindt: sapDateFormat.format(new Date(aData.at(item).DELDT)) + "T00:00:00", //DlvDt
                            Uebtk: aData.at(item).UNLIMITED,//Unlimited
                            Uebto: aData.at(item).OVERDELTOL,//OverDel Tol.
                            Untto: aData.at(item).UNDERDELTOL,//UnderDel Tol.
                            Zzmakt: aData.at(item).POADDTLDESC, //PO Addtl Desc
                            DeleteRec: true//Delete
                            
                        });
                        oParamDataPOClose.push({
                            Banfn: aData.at(item).PRNO, //PRNO
                            Bnfpo: aData.at(item).PRITM, //PRITM
                            Ebakz: "" 
                        })
                    });

                    if (oParamDataPO.length > 0) {
                        oParam = oParamInitParam;
                        oParam['N_ChangePOItemParam'] = oParamDataPO;
                        oParam['N_ChangePOClosePRParam'] = oParamDataPOClose;
                        oParam['N_ChangePOReturn'] = [];
                        console.log(oParam);
                        _promiseResult = new Promise((resolve, reject)=>{
                            oModel.create("/ChangePOSet", oParam, {
                                method: "POST",
                                success: function(oData, oResponse){
                                    if(oData.N_ChangePOReturn.results.length > 0){
                                        message = oData.N_ChangePOReturn.results[0].Msgv1;
                                        MessageBox.information(message);
                                        resolve()
                                    }else{
                                        MessageBox.information("No Details to Delete.");
                                    }
                                },error: function(error){
                                    MessageBox.error(error);
                                }
                            })
                        });
                        await _promiseResult;
                    }

                    this.closeLoadingDialog(that);

                }
            },
            onDeletePODelSched: async function(){
                var me = this;
                var bProceed = true;
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
                    MessageBox.information("PO is not deletable.")
                    bProceed = false;
                }
                this.getView().getModel("VPODtlsVPODet").getProperty("/results").forEach(item => {
                    if(item.DELETED || item.CLOSED){
                        MessageBox.information("PO is already Closed or Deleted.")
                        bProceed = false;
                    }
                });

                var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
                MessageBox.information(
                    "Proceed to delete selected record?",
                    {
                        actions: ["Delete", MessageBox.Action.CLOSE],
                        styleClass: bCompact ? "sapUiSizeCompact" : "",
                        onClose: function(sAction) {
                            MessageToast.show("Action selected: " + sAction);
                        }
                    }
                );
            },
            onEditHdrTxt: async function(type){
                var me = this;
                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
                    MessageBox.information("PO is not editable.")
                    return;
                }
                var me = this;
                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
                    MessageBox.information("PO is not editable.")
                    return;
                }

                var oTable;
                var aSelIndices;
                var oTmpSelectedIndices = [];

                var aData;
                var aDataToEdit = [];
                var iCounter = 0;
                
                if(type === 'Remarks'){
                    // oTable = this.byId("RemarksTbl");
                    // aSelIndices = oTable.getSelectedIndices();
                    // oTmpSelectedIndices = [];
                    // aData = me._oDataRemarksBeforeChange.results !== undefined ? me._oDataRemarksBeforeChange.results : me.getView().getModel("remarksTblData").getData();
                    // aDataToEdit = [];
                    // iCounter = 0;

                    _promiseResult = new Promise((resolve, reject)=>{
                        resolve(this.remarksTblLoad());
                    })
                    await _promiseResult;

                    this.byId("vpoEditHdrTxtRemarks").setVisible(false);
                    this.byId("vpoDeleteHdrTxtRemarks").setVisible(false);
                    this.byId("vpoSaveHdrTxtRemarks").setVisible(true);
                    this.byId("vpoCancelHdrTxtRemarks").setVisible(true);
                    
                    this.onRowEditPO("RemarksTbl", "VPORemarksCol");

                    
                    // if (aSelIndices.length > 0) {
                    //     aSelIndices.forEach(item => {
                    //         oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    //     });
    
                    //     aSelIndices = oTmpSelectedIndices;
    
                    //     aSelIndices.forEach((item, index) => {
                    //         iCounter++;
                    //         aDataToEdit.push(aData.at(item));
                    //         if (aSelIndices.length === iCounter) {
                    //             me._oDataRemarksBeforeChange.results = me.getView().getModel("remarksTblData").getData();
                    //             me.getView().getModel("remarksTblData").setProperty("/", aDataToEdit);
                    //             me.remarksSetTblColData();
                    //             me.onRowEditPO("RemarksTbl", "VPORemarksCol");

                    //             me.byId("vpoEditHdrTxtRemarks").setVisible(false);
                    //             me.byId("vpoDeleteHdrTxtRemarks").setVisible(false);
                    //             me.byId("vpoSaveHdrTxtRemarks").setVisible(true);
                    //             me.byId("vpoCancelHdrTxtRemarks").setVisible(true);

                    //         }
                    //     })
                    // }
                }
                if(type === 'PkgInst'){
                    // oTable = this.byId("PackingInstTbl");
                    // aSelIndices = oTable.getSelectedIndices();
                    // oTmpSelectedIndices = [];
                    // aData = me._oDataPkgInstBeforeChange.results !== undefined ? me._oDataPkgInstBeforeChange.results : me.getView().getModel("remarksTblData").getData();
                    // aDataToEdit = [];
                    // iCounter = 0;

                    _promiseResult = new Promise((resolve, reject)=>{
                        resolve(this.pkngInstTblLoad());
                    })
                    await _promiseResult;

                    this.byId("vpoEditHdrTxtPkgInst").setVisible(false);
                    this.byId("vpoDeleteHdrTxtPkgInst").setVisible(false);
                    this.byId("vpoSaveHdrTxtPkgInst").setVisible(true);
                    this.byId("vpoCancelHdrTxtPkgInst").setVisible(true);
                    
                    this.onRowEditPO("PackingInstTbl", "VPOPkngInstsCol");

                    // if (aSelIndices.length > 0) {
                    //     aSelIndices.forEach(item => {
                    //         oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    //     });
    
                    //     aSelIndices = oTmpSelectedIndices;
    
                    //     aSelIndices.forEach((item, index) => {
                    //         iCounter++;
                    //         aDataToEdit.push(aData.at(item));
                    //         if (aSelIndices.length === iCounter) {
                    //             me._oDataPkgInstBeforeChange.results = me.getView().getModel("pkngInstTblData").getData();
                    //             me.getView().getModel("pkngInstTblData").setProperty("/", aDataToEdit);
                    //             me.pkngInstSetTblColData();
                    //             me.onRowEditPO("PackingInstTbl", "VPOPkngInstsCol");

                    //             me.byId("vpoEditHdrTxtPkgInst").setVisible(false);
                    //             me.byId("vpoDeleteHdrTxtPkgInst").setVisible(false);
                    //             me.byId("vpoSaveHdrTxtPkgInst").setVisible(true);
                    //             me.byId("vpoCancelHdrTxtPkgInst").setVisible(true);

                    //         }
                    //     })
                    // }
                }
            },
            onSaveEditHdrTxt: async function(type){
                var me = this;
                var poNo = this._pono;

                var oTable;;
                var oSelectedIndices;
                var oTmpSelectedIndices = [];
                var aData;
                var oParamInitParam = {}
                var oParamDataPOHdr = [];
                var oParamDataPOClose = [];
                var oParam = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");

                var message;

                this.showLoadingDialog('Loading...')
                if(type === 'Remarks'){
                    oTable = this.byId("RemarksTbl");
                    oSelectedIndices = oTable.getBinding("rows").aIndices;

                    aData = oTable.getModel().getData().rows;
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })
                    oSelectedIndices = oTmpSelectedIndices;
                    oSelectedIndices.forEach((item, index) => {
                        oParamInitParam = {
                            IPoNumber: poNo,
                            IDoDownload: "N",
                            IChangeonlyHdrplants: "N",
                        }
                        oParamDataPOHdr.push({
                            PoNumber: poNo,
                            PoItem: "00000",
                            TextId: "F01",
                            TextForm: "*",
                            TextLine: aData.at(item).Tdline
                        })
                        
                    });

                    if (oParamDataPOHdr.length > 0) {
                        oParam = oParamInitParam;
                        oParam['N_ChangePOHdrTextParam'] = oParamDataPOHdr;
                        oParam['N_ChangePOReturn'] = [];
                        console.log(oParam);
                        _promiseResult = new Promise((resolve, reject)=>{
                            oModel.create("/ChangePOSet", oParam, {
                                method: "POST",
                                success: function(oData, oResponse){
                                    if(oData.N_ChangePOReturn.results.length > 0){
                                        message = oData.N_ChangePOReturn.results[0].Msgv1;
                                        MessageBox.information(message);
                                        resolve()
                                    }else{
                                        MessageBox.information("No Details to be saved.");
                                        resolve()
                                    }
                                },error: function(error){
                                    MessageBox.error("Error Occured");
                                    me.closeLoadingDialog(that);
                                    resolve()
                                }
                            })
                        });
                        await _promiseResult;
                    }

                    _promiseResult = new Promise((resolve, reject)=>{
                        me.byId("vpoEditHdrTxtRemarks").setVisible(true);
                        me.byId("vpoDeleteHdrTxtRemarks").setVisible(true);
                        me.byId("vpoSaveHdrTxtRemarks").setVisible(false);
                        me.byId("vpoCancelHdrTxtRemarks").setVisible(false);
                        
                        resolve(me.loadAllData())
                    });
                    await _promiseResult;
                }
                if(type === 'PkgInst'){
                    oTable = this.byId("PackingInstTbl");
                    oSelectedIndices = oTable.getBinding("rows").aIndices;

                    aData = oTable.getModel().getData().rows;
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })
                    oSelectedIndices = oTmpSelectedIndices;
                    oSelectedIndices.forEach((item, index) => {
                        oParamInitParam = {
                            IPoNumber: poNo,
                            IDoDownload: "N",
                            IChangeonlyHdrplants: "N",
                        }
                        oParamDataPOHdr.push({
                            PoNumber: poNo,
                            PoItem: "00000",
                            TextId: "F06",
                            TextForm: "*",
                            TextLine: aData.at(item).Tdline
                        })
                        
                    });

                    if (oParamDataPOHdr.length > 0) {
                        oParam = oParamInitParam;
                        oParam['N_ChangePOHdrTextParam'] = oParamDataPOHdr;
                        oParam['N_ChangePOReturn'] = [];
                        console.log(oParam);
                        _promiseResult = new Promise((resolve, reject)=>{
                            oModel.create("/ChangePOSet", oParam, {
                                method: "POST",
                                success: function(oData, oResponse){
                                    if(oData.N_ChangePOReturn.results.length > 0){
                                        message = oData.N_ChangePOReturn.results[0].Msgv1;
                                        MessageBox.information(message);
                                        resolve()
                                    }else{
                                        MessageBox.information("No Details to be saved.");
                                        resolve()
                                    }
                                },error: function(error){
                                    MessageBox.error("Error Occured");
                                    me.closeLoadingDialog(that);
                                    resolve()
                                }
                            })
                        });
                        await _promiseResult;
                    }

                    _promiseResult = new Promise((resolve, reject)=>{
                        me.byId("vpoEditHdrTxtPkgInst").setVisible(true);
                        me.byId("vpoDeleteHdrTxtPkgInst").setVisible(true);
                        me.byId("vpoSaveHdrTxtPkgInst").setVisible(false);
                        me.byId("vpoCancelHdrTxtPkgInst").setVisible(false);
                        
                        resolve(me.loadAllData());
                    });
                    await _promiseResult;
                }
                MessageToast.show(message);
                this.closeLoadingDialog(that);
            },
            onDeleteEditHdrTxt: async function(type){
                var me = this;
                var poNo = this._pono;
                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
                    MessageBox.information("PO is not editable.")
                    return;
                }
                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
                    MessageBox.information("PO is not editable.")
                    return;
                }

                var oTable;
                var aSelIndices;
                var indicesCol;
                var diffIndeces;

                var oTmpSelectedIndices = [];

                var aData;
                var aDataToNotDelete = [];
                var iCounter = 0;

                var oParamInitParam = {}
                var oParamDataPOHdr = [];
                var oParam = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");

                var message;

                if(type === 'Remarks'){
                    oTable = this.byId("RemarksTbl");
                    aSelIndices = oTable.getSelectedIndices();
                    oTmpSelectedIndices = [];
                    aData = me._oDataRemarksBeforeChange.results !== undefined ? me._oDataRemarksBeforeChange.results : me.getView().getModel("remarksTblData").getData();
                    aDataToNotDelete = [];
                    iCounter = 0;
                    
                    indicesCol = oTable.getBinding("rows").aIndices;

                    if (aSelIndices.length > 0) {

                        diffIndeces = indicesCol.filter(function(obj) { return aSelIndices.indexOf(obj) == -1; });
                        diffIndeces.forEach((item, index) => {
                            aDataToNotDelete.push(aData.at(item))
                        });
                        if(aDataToNotDelete.length > 0){
                            aDataToNotDelete.forEach(item=>{
                                oParamInitParam = {
                                    IPoNumber: poNo,
                                    IDoDownload: "N",
                                    IChangeonlyHdrplants: "N",
                                }
                                oParamDataPOHdr.push({
                                    PoNumber: poNo,
                                    PoItem: "00000",
                                    TextId: "F01",
                                    TextForm: "*",
                                    TextLine: item.Tdline
                                })
                            });

                            if (oParamDataPOHdr.length > 0) {
                                this.showLoadingDialog('Loading...');
                                oParam = oParamInitParam;
                                oParam['N_ChangePOHdrTextParam'] = oParamDataPOHdr;
                                oParam['N_ChangePOReturn'] = [];
                                console.log(oParam);
                                _promiseResult = new Promise((resolve, reject)=>{
                                    oModel.create("/ChangePOSet", oParam, {
                                        method: "POST",
                                        success: function(oData, oResponse){
                                            if(oData.N_ChangePOReturn.results.length > 0){
                                                message = oData.N_ChangePOReturn.results[0].Msgv1;
                                                MessageBox.information(message);
                                                resolve()
                                            }else{
                                                MessageBox.information("No Details to be Deleted.");
                                                resolve()
                                            }
                                        },error: function(error){
                                            MessageBox.error("Error Occured");
                                            me.closeLoadingDialog(that);
                                            resolve()
                                        }
                                    })
                                });
                                await _promiseResult;
                                
                                _promiseResult = new Promise((resolve, reject)=>{
                                    resolve(me.loadAllData())
                                });
                                await _promiseResult;
                                this.closeLoadingDialog(that);
                            }
                        }
                    }
                    // if (aSelIndices.length > 0) {
                    //     aSelIndices.forEach(item => {
                    //         oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    //     });
    
                    //     aSelIndices = oTmpSelectedIndices;
    
                    //     aSelIndices.forEach((item, index) => {
                    //         iCounter++;
                    //         aDataToNotDelete.push(aData.at(item));
                    //         if (aSelIndices.length === iCounter) {
                    //             aDataToNotDelete.forEach(item=>{
                    //                 oParamInitParam = {
                    //                     IPoNumber: poNo,
                    //                     IDoDownload: "N",
                    //                     IChangeonlyHdrplants: "N",
                    //                 }
                    //                 oParamDataPOHdr.push({
                    //                     PoNumber: poNo,
                    //                     PoItem: "00000",
                    //                     TextId: "F01",
                    //                     TextForm: "*",
                    //                     TextLine: item.Tdline
                    //                 })
                    //             });
                    //         }
                    //     })
                    // }
                    // if (oParamDataPOHdr.length > 0) {
                    //     this.showLoadingDialog('Loading...');
                    //     oParam = oParamInitParam;
                    //     oParam['N_ChangePOHdrTextParam'] = oParamDataPOHdr;
                    //     oParam['N_ChangePOReturn'] = [];
                    //     console.log(oParam);
                    //     _promiseResult = new Promise((resolve, reject)=>{
                    //         oModel.create("/ChangePOSet", oParam, {
                    //             method: "POST",
                    //             success: function(oData, oResponse){
                    //                 if(oData.N_ChangePOReturn.results.length > 0){
                    //                     message = oData.N_ChangePOReturn.results[0].Msgv1;
                    //                     MessageBox.information(message);
                    //                     resolve()
                    //                 }else{
                    //                     MessageBox.information("No Details to be Deleted.");
                    //                     resolve()
                    //                 }
                    //             },error: function(error){
                    //                 MessageBox.error("Error Occured");
                    //                 me.closeLoadingDialog(that);
                    //                 resolve()
                    //             }
                    //         })
                    //     });
                    //     await _promiseResult;
                        
                    //     _promiseResult = new Promise((resolve, reject)=>{
                    //         resolve(me.loadAllData())
                    //     });
                    //     await _promiseResult;
                    //     this.closeLoadingDialog(that);
                    // }
                }
                if(type === 'PkgInst'){
                    oTable = this.byId("PackingInstTbl");
                    aSelIndices = oTable.getSelectedIndices();
                    oTmpSelectedIndices = [];
                    aData = me._oDataPkgInstBeforeChange.results !== undefined ? me._oDataPkgInstBeforeChange.results : me.getView().getModel("pkngInstTblData").getData();
                    aDataToNotDelete = [];
                    iCounter = 0;
                    
                    indicesCol = oTable.getBinding("rows").aIndices;

                    if (aSelIndices.length > 0) {

                        diffIndeces = indicesCol.filter(function(obj) { return aSelIndices.indexOf(obj) == -1; });
                        diffIndeces.forEach((item, index) => {
                            aDataToNotDelete.push(aData.at(item))
                        });
                        if(aDataToNotDelete.length > 0){
                            aDataToNotDelete.forEach(item=>{
                                oParamInitParam = {
                                    IPoNumber: poNo,
                                    IDoDownload: "N",
                                    IChangeonlyHdrplants: "N",
                                }
                                oParamDataPOHdr.push({
                                    PoNumber: poNo,
                                    PoItem: "00000",
                                    TextId: "F06",
                                    TextForm: "*",
                                    TextLine: item.Tdline
                                })
                            });

                            if (oParamDataPOHdr.length > 0) {
                                this.showLoadingDialog('Loading...');
                                oParam = oParamInitParam;
                                oParam['N_ChangePOHdrTextParam'] = oParamDataPOHdr;
                                oParam['N_ChangePOReturn'] = [];
                                console.log(oParam);
                                _promiseResult = new Promise((resolve, reject)=>{
                                    oModel.create("/ChangePOSet", oParam, {
                                        method: "POST",
                                        success: function(oData, oResponse){
                                            if(oData.N_ChangePOReturn.results.length > 0){
                                                message = oData.N_ChangePOReturn.results[0].Msgv1;
                                                MessageBox.information(message);
                                                resolve()
                                            }else{
                                                MessageBox.information("No Details to be Deleted.");
                                                resolve()
                                            }
                                        },error: function(error){
                                            MessageBox.error("Error Occured");
                                            me.closeLoadingDialog(that);
                                            resolve()
                                        }
                                    })
                                });
                                await _promiseResult;
                                
                                _promiseResult = new Promise((resolve, reject)=>{
                                    resolve(me.loadAllData())
                                });
                                await _promiseResult;
                                this.closeLoadingDialog(that);
                            }
                        }
                    }

                    // if (aSelIndices.length > 0) {
                    //     aSelIndices.forEach(item => {
                    //         oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    //     });
    
                    //     aSelIndices = oTmpSelectedIndices;
    
                    //     aSelIndices.forEach((item, index) => {
                    //         iCounter++;
                    //         aDataToNotDelete.push(aData.at(item));
                    //         if (aSelIndices.length === iCounter) {
                    //             aDataToNotDelete.forEach(item=>{
                    //                 oParamInitParam = {
                    //                     IPoNumber: poNo,
                    //                     IDoDownload: "N",
                    //                     IChangeonlyHdrplants: "N",
                    //                 }
                    //                 oParamDataPOHdr.push({
                    //                     PoNumber: poNo,
                    //                     PoItem: "00000",
                    //                     TextId: "F06",
                    //                     TextForm: "*",
                    //                     TextLine: item.Tdline
                    //                 })
                    //             });
                    //         }
                    //     })
                    // }
                    // if (oParamDataPOHdr.length > 0) {
                    //     this.showLoadingDialog('Loading...');
                    //     oParam = oParamInitParam;
                    //     oParam['N_ChangePOHdrTextParam'] = oParamDataPOHdr;
                    //     oParam['N_ChangePOReturn'] = [];
                    //     console.log(oParam);
                    //     _promiseResult = new Promise((resolve, reject)=>{
                    //         oModel.create("/ChangePOSet", oParam, {
                    //             method: "POST",
                    //             success: function(oData, oResponse){
                    //                 if(oData.N_ChangePOReturn.results.length > 0){
                    //                     message = oData.N_ChangePOReturn.results[0].Msgv1;
                    //                     MessageBox.information(message);
                    //                     resolve()
                    //                 }else{
                    //                     MessageBox.information("No Details to be Deleted.");
                    //                     resolve()
                    //                 }
                    //             },error: function(error){
                    //                 MessageBox.error("Error Occured");
                    //                 me.closeLoadingDialog(that);
                    //                 resolve()
                    //             }
                    //         })
                    //     });
                    //     await _promiseResult;

                    //     _promiseResult = new Promise((resolve, reject)=>{
                    //         resolve(me.loadAllData())
                    //     });
                    //     await _promiseResult;
                    //     this.closeLoadingDialog(that);
                    // }
                }
                MessageToast.show("DELETE CLICKED");
            },
            onCancelEditHdrTxt: async function(type){

                if(type === 'Remarks'){
                    this.byId("vpoEditHdrTxtRemarks").setVisible(true);
                    this.byId("vpoDeleteHdrTxtRemarks").setVisible(true);
                    this.byId("vpoSaveHdrTxtRemarks").setVisible(false);
                    this.byId("vpoCancelHdrTxtRemarks").setVisible(false);
                }
                if(type === 'PkgInst'){
                    this.byId("vpoEditHdrTxtPkgInst").setVisible(true);
                    this.byId("vpoDeleteHdrTxtPkgInst").setVisible(true);
                    this.byId("vpoSaveHdrTxtPkgInst").setVisible(false);
                    this.byId("vpoCancelHdrTxtPkgInst").setVisible(false);
                }
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(this.loadAllData());
                });
                await _promiseResult;
            }
        });
    });
