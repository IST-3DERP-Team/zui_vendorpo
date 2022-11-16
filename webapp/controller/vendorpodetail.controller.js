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

                this._headerIsEdited = false;
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

                //Captions
                this.callCaptionsAPI();

                //On Key Up delegate
                var oDelegateKeyUp = {
                    onkeyup: function(oEvent){
                        that.onKeyUp(oEvent);
                    }
                };
                this.byId("vpoDetailsTab").addEventDelegate(oDelegateKeyUp);
                this.byId("vpoDelSchedTab").addEventDelegate(oDelegateKeyUp);
                this.byId("vpoDelInvTab").addEventDelegate(oDelegateKeyUp);
                this.byId("vpoPoHistTab").addEventDelegate(oDelegateKeyUp);
                this.byId("vpoConditionsTab").addEventDelegate(oDelegateKeyUp);

                //Initialize router
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                
                this._router.getRoute("vendorpodetail").attachPatternMatched(this._routePatternMatched, this);
                
                //Initialize translations
                this._i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                this.getView().setModel(new JSONModel({
                    dataMode: 'NODATA',
                    activePONo: '',
                    activePOItem: '',
                    activeCondRec: ''
                }), "ui");
            },
            _routePatternMatched: async function (oEvent) {
                var me = this;
                this._pono = oEvent.getParameter("arguments").PONO;
                this._condrec = oEvent.getParameter("arguments").CONDREC;
                this._sbu = oEvent.getParameter("arguments").SBU;


                this.getView().getModel("ui").setProperty("/activePONo", this._pono);
                this.getView().getModel("ui").setProperty("/activeCondRec", this._condrec);
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
                oDDTextParam.push({CODE: "SBU"});
                oDDTextParam.push({CODE: "VENDOR"});
                oDDTextParam.push({CODE: "DOCTYP"});
                oDDTextParam.push({CODE: "COMPANY"});
                oDDTextParam.push({CODE: "SHIPTOPLANT"});

                oDDTextParam.push({CODE: "SEARCH"});
                oDDTextParam.push({CODE: "ADD"});
                oDDTextParam.push({CODE: "EDIT"});
                oDDTextParam.push({CODE: "REFRESH"});
                oDDTextParam.push({CODE: "SAVELAYOUT"});
                oDDTextParam.push({CODE: "SAVE"});
                oDDTextParam.push({CODE: "CANCEL"});
                oDDTextParam.push({CODE: "DELETE"});

                oDDTextParam.push({CODE: "DETAILS"});
                oDDTextParam.push({CODE: "DELSCHED"});
                oDDTextParam.push({CODE: "DELIVERY"});
                oDDTextParam.push({CODE: "INVOICE"});
                oDDTextParam.push({CODE: "POHIST"});

                oDDTextParam.push({CODE: "PONO"});
                oDDTextParam.push({CODE: "POITEM"});
                oDDTextParam.push({CODE: "CONDREC"});

                oDDTextParam.push({CODE: "LOADING"});


                oDDTextParam.push({CODE: "HEADER"});
                oDDTextParam.push({CODE: "RELSTRAT"});
                oDDTextParam.push({CODE: "CONDITIONS"});
                oDDTextParam.push({CODE: "HEADERTEXT"});
                oDDTextParam.push({CODE: "CHANGES"});

                oDDTextParam.push({CODE: "POACTIONS"});
                oDDTextParam.push({CODE: "CHANGEDELVDATE"});
                oDDTextParam.push({CODE: "CHANGEVENDOR"});
                oDDTextParam.push({CODE: "DELETEPO"});
                oDDTextParam.push({CODE: "CANCELPO"});
                oDDTextParam.push({CODE: "SPLITPO"});

                oDDTextParam.push({CODE: "PODATE"});
                oDDTextParam.push({CODE: "PURCHORG"});
                oDDTextParam.push({CODE: "PURCHGRP"});
                oDDTextParam.push({CODE: "PURCHPLANT"});
                oDDTextParam.push({CODE: "CURRENCY"});
                oDDTextParam.push({CODE: "INCOTERMS"});
                oDDTextParam.push({CODE: "DESTINATION"});
                oDDTextParam.push({CODE: "SHIPMODE"});
                oDDTextParam.push({CODE: "RELSTAT"});

                oDDTextParam.push({CODE: "RELGRP"});
                oDDTextParam.push({CODE: "RELSTRAT"});
                oDDTextParam.push({CODE: "EXPECTEDREL"});
                oDDTextParam.push({CODE: "RELCD"});
                oDDTextParam.push({CODE: "RELIND"});
                oDDTextParam.push({CODE: "RELTODT"});

                oDDTextParam.push({CODE: "REMARKS"});
                oDDTextParam.push({CODE: "PACKINSTRUCT"});

                oDDTextParam.push({CODE: "ADDPRTOPO"});
                oDDTextParam.push({CODE: "ITEMCHANGES"});
                oDDTextParam.push({CODE: "LINESPLIT"});

                oDDTextParam.push({CODE: "INFO_DISCARD_CHANGES"});
                oDDTextParam.push({CODE: "YES"});
                oDDTextParam.push({CODE: "CANCEL"});

                
                await oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                    method: "POST",
                    success: function(oData, oResponse) {
                        oData.CaptionMsgItems.results.forEach(item=>{
                            oDDTextResult[item.CODE] = item.TEXT;
                        })
                        
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
                        }
                            
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

                            var poItem = data.results[0].ITEM;
                            _this.getView().getModel("ui").setProperty("/activePOItem", poItem);

                            _this.getView().setModel(oJSONModel, "VPODtlsVPODet");
                            resolve();
                        },
                        error: function (err) { }
                    });
                });
            },

            getCols: async function() {
                
                var oModel = this.getOwnerComponent().getModel();

                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(this.getDynamicColumns("VPODTLS", "ZDV_3DERP_VPDTLS"));
                });
                await _promiseResult
                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(this.getDynamicColumns('VPODELSCHED','ZVB_VPO_DELSCHED'));
                });
                await _promiseResult
                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(this.getDynamicColumns('VPODELINV','ZDV_3DERP_DELINV'));
                });
                await _promiseResult
                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(this.getDynamicColumns('VPOHISTORY','ZDV_3DERP_POHIST'));
                });
                await _promiseResult
                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(this.getDynamicColumns('VPOCOND','ZDV_3DERP_COND'));
                });
                await _promiseResult

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
                                    console.log(oResponse);
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
                                //Add PR to PO Column
                                if (modCode === 'VPOADDPRTOPO') {
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VPOAddPRtoPOColumns");
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
                                //Add PR to PO Column
                                if (modCode === 'VPOADDPRTOPO') {
                                    me.getView().setModel(oJSONColumnsModel, "VPOAddPRtoPOColumns");
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
                //Add PR To PO
                if (modCode === 'VPOADDPRTOPO') {
                    oColumnsModel = me.getView().getModel("VPOAddPRtoPO");  
                    oDataModel = me.getView().getModel("VPOAddPRtoPOColumns"); 
                    
                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');

                    if(me._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');   
                    me.addColumns("vpoAddPRtoPOTbl", oColumnsData, oData, "VPOAddPRtoPO");
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
                var bProceed = false

                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;
                
                this.getView().getModel("VPODtlsVPODet").getProperty("/results").forEach(item => {
                    
                    if(item.DELETED !== true && item.CLOSED !== true){
                        bProceed = true;
                        console.log(bProceed)
                    }
                })
                if(bProceed){
                    if(this._validPOChange != 1){
                        oDataEdit.SHIPTOPLANT = true;//ShipToPlant
                    }else{
                        oDataEdit.SHIPTOPLANT = true;//ShipToPlant
                        oDataEdit.PAYMNTTERMS = true;//Payment Terms
                        oDataEdit.INCOTERMS = true;//IncoTerms
                        oDataEdit.DEST = true;//Destination
                    }
                    oJSONEdit.setData(oDataEdit);
                
                    this.byId("vpoBtnEditHeader").setVisible(false);
                    this.byId("vpoBtnRefreshtHeader").setVisible(false);
                    this.byId("vpoBtnSaveHeader").setVisible(true);
                    this.byId("vpoBtnCancelHeader").setVisible(true);
                    oView.setModel(oJSONEdit, "topHeaderDataEdit");
                }else{
                    MessageBox.information("PO is not valid to Edit.")
                }
            },
            onHeaderInputChange: async function(oEvent){
                if(oEvent.getParameters().value === oEvent.getSource().getBindingInfo("value").binding.oValue){
                    this._headerIsEdited = false;
                }else{
                    this._headerIsEdited = true;
                }
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
                var actionSel;
                
                var oDataEDitModel = this.getView().getModel("topHeaderDataEdit"); 
                var oDataEdit = oDataEDitModel.getProperty('/');
                console.log(this._headerIsEdited)
                if (this._headerIsEdited) {
                    var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
                    _promiseResult = new Promise((resolve, reject) => {
                        MessageBox.information(
                            this.getView().getModel("captionMsg").getData()["INFO_DISCARD_CHANGES"],
                            {
                                actions: [this.getView().getModel("captionMsg").getData()["YES"], this.getView().getModel("captionMsg").getData()["CANCEL"]],
                                styleClass: bCompact ? "sapUiSizeCompact" : "",
                                onClose: function(sAction) {
                                    actionSel = sAction;
                                    resolve(actionSel);
                                }
                            }
                        );
                    })
                    await _promiseResult;

                    if(actionSel === "Yes"){
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

                    }else if(actionSel === "Cancel"){
                        MessageBox.Action.CLOSE
                    }

                }else{
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
                }

            },

            onChangeVendorVPOHeader: async function(){
                MessageToast.show("Changed CLick");
                var me = this;
                
                var poNo = this._pono
                var oModel = this.getOwnerComponent().getModel();
                var rfcModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var bProceed = true;

                this._purchOrg = "";
                this._vendorCd = "";
                this._purchGrp = "";
                this._newVendorCd = "";

                var changeVendorData = {};
                var oJSONModel = new JSONModel();
                var vendorSelJSONModel = new JSONModel();

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
                this.showLoadingDialog('Loading...')
                var poNo = this._pono
                var oModel = this.getOwnerComponent().getModel();
                var rfcModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                // /VPOVendorMatRscSet
                var material; 

                var newVendorCd = this._newVendorCd;
                var vendorCd = this._vendorCd;
                var purchOrg = this._purchOrg;
                var purchGrp = this._purchGrp;

                var bProceed = true;
                
                var oParam = {};
                var importParam = [];

                var changeVendorParam = {};
                var message;

                if(newVendorCd === undefined || newVendorCd === "" || newVendorCd === null){
                    MessageBox.error("New Vendor Code is Empty!")
                    bProceed = false;
                }

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
                        _promiseResult = new Promise((resolve, reject)=>{
                            rfcModel.create("/GetInfoRecordSet", oParam, {
                                method: "POST",
                                success: function(oData, oResponse) {
                                    console.log(oData)
                                    resolve();
                                },
                                error: function(err){
                                    resolve();
                                }
                            });
                        });
                        await _promiseResult;
                        
                        if(bProceed){
                            changeVendorParam ={
                                "ev_lifnr": newVendorCd, 
                                "ev_ebeln": poNo, 
                                "ev_uname": "JFIRME", 
                                "N_CT_BAPIRET2": [], 
                                "N_CT_UASCOND": [], 
                                "N_CT_UASPO": []
                            };
                            _promiseResult = new Promise((resolve, reject)=>{
                                rfcModel.create("/Get_PO_Change_VendorSet", changeVendorParam, {
                                    method: "POST",
                                    success: function(oData, oResponse) {
                                        if(oData.iv_msgtyp === "E"){
                                            message = oData.iv_msgtyp + " " + oData.iv_msgv1;
                                            MessageBox.error(message);
                                        }else{
                                            message = oData.iv_msgtyp + " " + oData.iv_msgv1;
                                            MessageBox.information(message);
                                        }
                                        resolve();
                                    },
                                    error: function(err){
    
                                    }
                                });
                            });
                            await _promiseResult;
                        }

                    }
                }
                this.closeLoadingDialog(that);
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
                this._newDlvDate = ""

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
                    NewDlvDateLabel: "New Delivery Date",
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
                var bProceed = true;

                var message;

                var oTmpSelectedIndices = [];
                var oTable = this.byId("vpoDetailsTab");
                var oSelectedIndices = oTable.getBinding("rows").aIndices;
                var aData = oTable.getModel().getData().rows;

                var validPOItem

                if(this._newDlvDate === undefined || this._newDlvDate === "" || this._newDlvDate === null){
                    MessageBox.error("Delivery Date is Empty!")
                    bProceed = false;
                }

                oSelectedIndices.forEach(item => {
                    oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                })
                oSelectedIndices = oTmpSelectedIndices;
                
                if(bProceed){
                    oSelectedIndices.forEach((item, index) => {
                        if (aData.at(item).DELETED === false) {
                            validPOItem = item;

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
                        }
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
                                        console.log(oData);
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
                                    MessageBox.error("Error Occured");
                                    resolve()
                                }
                            })
                        });
                        await _promiseResult;
                    }
                }
                this.loadAllData()

                this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                this.closeLoadingDialog(that);
            },
            onDatePickVPODelvDateChange: async function(oEvent){
                this._newDlvDate = oEvent.getParameter("value");
			    // var bValid = oEvent.getParameter("valid");
                // console.log(this._newDlvDate);
                // console.log(sValue);
                // console.log(bValid);
            },

            onDeleteVPO: async function(){
                var me = this;
                var actionSel;
                var poNo = this._pono;

                var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
                _promiseResult = new Promise((resolve, reject) => {
                    MessageBox.information(
                        "Proceed to Delete Vendor PO?",
                        {
                            actions: ["Delete", MessageBox.Action.CLOSE],
                            styleClass: bCompact ? "sapUiSizeCompact" : "",
                            onClose: function(sAction) {
                                actionSel = sAction;
                                resolve(actionSel);
                            }
                        }
                    );
                })
                await _promiseResult;
                if(actionSel === "Delete"){
                    this.showLoadingDialog('Loading...')
                    var oParamInitParam = {}
                    var oParamDataPO = [];
                    var oParamDataPOClose = [];
                    var oParam = {};
                    var oModel = this.getOwnerComponent().getModel();
                    var rfcModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                    var bProceed = true;

                    var message;

                    var frgke; //release PO

                    var oTmpSelectedIndices = [];
                    var oTable = this.byId("vpoDetailsTab");
                    var oSelectedIndices = oTable.getBinding("rows").aIndices;
                    var aData = oTable.getModel().getData().rows;

                    var validPOItem;

                    _promiseResult = new Promise((resolve, reject)=>{
                        resolve(me.validatePOChange());
                    })
                    await _promiseResult;

                    _promiseResult = new Promise((resolve, reject)=>{
                        oModel.read("/mainSet(PONO='" + poNo + "')", {
                            success: function (oData, oResponse) {
                                // if (oData.PODT !== null)
                                //     oData.PODT = dateFormat.format(new Date(oData.PODT));
                                console.log(oData)
                                frgke = oData.FRGKE
                                resolve();
                            },
                            error: function () {
                                bProceed = false;
                                resolve();
                            }
                        });
                    });
                    
                    await _promiseResult;

                    if(frgke === "G"){
                        MessageBox.error("PO is already released, use Cancel PO instead.")
                        bProceed = false
                    }
                    
                    if(this._validPOChange != 1){
                        if(bProceed){
                            MessageBox.information("PO is not valid to Delete.")
                            bProceed = false;
                        }    
                    }
                    
                    if(bProceed){
                        this.getView().getModel("ui").setProperty("/dataMode", 'DELETE');
                        oSelectedIndices.forEach(item => {
                            oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                        })
                        oSelectedIndices = oTmpSelectedIndices;

                        oSelectedIndices.forEach((item, index) => {
                            if (aData.at(item).DELETED === false) {
                                validPOItem = item;
    
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
                                    Eindt: sapDateFormat.format(new Date(aData.at(item).DELDT)) + "T00:00:00", //DlvDt
                                    Uebtk: aData.at(validPOItem).UNLIMITED,//Unlimited
                                    Uebto: aData.at(validPOItem).OVERDELTOL,//OverDel Tol.
                                    Untto: aData.at(validPOItem).UNDERDELTOL,//UnderDel Tol.
                                    Zzmakt: aData.at(validPOItem).POADDTLDESC, //PO Addtl Desc
                                    Elikz: aData.at(validPOItem).CLOSED, //Closed
                                    DeleteRec: true//Delete
                                    // Delete_Rec: aData.at(item).DELETED//Delete
                                });
                                oParamDataPOClose.push({
                                    Banfn: aData.at(validPOItem).PRNO, //PRNO
                                    Bnfpo: aData.at(validPOItem).PRITM, //PRITM
                                    Ebakz: "" 
                                });
                            }
                        });
                        if (oParamDataPO.length > 0) {
                            oParam = oParamInitParam;
                            oParam['N_ChangePOItemParam'] = oParamDataPO;
                            oParam['N_ChangePOClosePRParam'] = oParamDataPOClose;
                            oParam['N_ChangePOReturn'] = [];
                            console.log(oParam);
                            _promiseResult = new Promise((resolve, reject)=>{
                                rfcModel.create("/ChangePOSet", oParam, {
                                    method: "POST",
                                    success: function(oData, oResponse){
                                        if(oData.N_ChangePOReturn.results.length > 0){
                                            console.log(oData);
                                            if(oData.N_ChangePOReturn.results[0].Msgtyp === "E"){
                                                message = oData.N_ChangePOReturn.results[0].Msgv1;
                                                MessageBox.information(message);
                                                resolve()
                                            }else{
                                                message = oData.N_ChangePOReturn.results[0].Msgv1;
                                                MessageBox.information(message);
                                                resolve()
                                            }
                                        }else{
                                            MessageBox.information("No Details to Delete.");
                                            resolve()
                                        }
                                    },error: function(error){
                                        MessageBox.error("Error Occured");
                                        resolve()
                                    }
                                })
                            });
                            await _promiseResult;
                        }
                        this.loadAllData()
                        this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                    }
                    
                    this.closeLoadingDialog(that);
                }
            },
            onCancelVPO: async function(){
                var actionSel;

                var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
                _promiseResult = new Promise((resolve, reject) => {
                    MessageBox.information(
                        "Proceed to Cancel Vendor PO?",
                        {
                            actions: ["Cancel PO", MessageBox.Action.CLOSE],
                            styleClass: bCompact ? "sapUiSizeCompact" : "",
                            onClose: function(sAction) {
                                actionSel = sAction;
                                resolve(actionSel);
                            }
                        }
                    );
                })
                await _promiseResult;
                if(actionSel === "Cancel PO"){
                    this.showLoadingDialog('Loading...')
                    var oParamInitParam = {}
                    var oParamDataPO = [];
                    var oParamDataPOClose = [];
                    var oParam = {};
                    var oModel = this.getOwnerComponent().getModel();
                    var rfcModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                    var bProceed = true;

                    var message;

                    var frgke; //release PO

                    var oTmpSelectedIndices = [];
                    var oTable = this.byId("vpoDetailsTab");
                    var oSelectedIndices = oTable.getBinding("rows").aIndices;
                    var aData = oTable.getModel().getData().rows;

                    var validPOItem;

                    _promiseResult = new Promise((resolve, reject)=>{
                        resolve(me.validatePOChange());
                    })
                    await _promiseResult;

                    _promiseResult = new Promise((resolve, reject)=>{
                        oModel.read("/mainSet(PONO='" + poNo + "')", {
                            success: function (oData, oResponse) {
                                // if (oData.PODT !== null)
                                //     oData.PODT = dateFormat.format(new Date(oData.PODT));
                                console.log(oData)
                                frgke = oData.FRGKE
                                resolve();
                            },
                            error: function () {
                                bProceed = false;
                                resolve();
                            }
                        });
                    });
                    
                    await _promiseResult;

                    if(frgke !== "G"){
                        MessageBox.error("PO is not yet released, use Delete PO instead.")
                        bProceed = false
                    }
                    if(this._validPOChange != 1){
                        if(bProceed){
                            MessageBox.information("PO is not valid to Cancel.")
                            bProceed = false;
                        }    
                    }

                    if(bProceed){
                        this.getView().getModel("ui").setProperty("/dataMode", 'CANCEL_PO');
                        oSelectedIndices.forEach(item => {
                            oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                        })
                        oSelectedIndices = oTmpSelectedIndices;

                        oSelectedIndices.forEach((item, index) => {
                            if (aData.at(item).DELETED === false) {
                                validPOItem = item;
    
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
                                    Eindt: sapDateFormat.format(new Date(aData.at(item).DELDT)) + "T00:00:00", //DlvDt
                                    Uebtk: aData.at(validPOItem).UNLIMITED,//Unlimited
                                    Uebto: aData.at(validPOItem).OVERDELTOL,//OverDel Tol.
                                    Untto: aData.at(validPOItem).UNDERDELTOL,//UnderDel Tol.
                                    Zzmakt: aData.at(validPOItem).POADDTLDESC, //PO Addtl Desc
                                    Elikz: aData.at(validPOItem).CLOSED, //Closed
                                    DeleteRec: true//Delete
                                    // Delete_Rec: aData.at(item).DELETED//Delete
                                });
                                oParamDataPOClose.push({
                                    Banfn: aData.at(validPOItem).PRNO, //PRNO
                                    Bnfpo: aData.at(validPOItem).PRITM, //PRITM
                                    Ebakz: "" 
                                });
                            }
                        });
                        if (oParamDataPO.length > 0) {
                            oParam = oParamInitParam;
                            oParam['N_ChangePOItemParam'] = oParamDataPO;
                            oParam['N_ChangePOClosePRParam'] = oParamDataPOClose;
                            oParam['N_ChangePOReturn'] = [];
                            console.log(oParam);
                            _promiseResult = new Promise((resolve, reject)=>{
                                rfcModel.create("/ChangePOSet", oParam, {
                                    method: "POST",
                                    success: function(oData, oResponse){
                                        if(oData.N_ChangePOReturn.results.length > 0){
                                            console.log(oData);
                                            if(oData.N_ChangePOReturn.results[0].Msgtyp === "E"){
                                                message = oData.N_ChangePOReturn.results[0].Msgv1;
                                                MessageBox.information(message);
                                                resolve()
                                            }else{
                                                message = oData.N_ChangePOReturn.results[0].Msgv1;
                                                MessageBox.information(message);
                                                resolve()
                                            }
                                        }else{
                                            MessageBox.information("No Details to Cancel.");
                                            resolve()
                                        }
                                    },error: function(error){
                                        MessageBox.error("Error Occured");
                                        resolve()
                                    }
                                })
                            });
                            await _promiseResult;
                        }
                        this.loadAllData()
                        this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                    }
                    
                    this.closeLoadingDialog(that);
                }
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
                                            // me.byId("vpoSearchFieldDetails").setVisible(false);
                                            me.byId("vpoBtnAddPRtoPO").setVisible(false);
                                            me.byId("vpoBtnItemChanges").setVisible(false);
                                            me.byId("vpoBtnRefreshDetails").setVisible(false);
                                            me.byId("vpoBtnEditDetails").setVisible(false);
                                            me.byId("vpoBtnDeleteDetails").setVisible(false);
                                            me.byId("vpoBtnSaveLayoutDetails").setVisible(false);
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
                    // me.byId("vpoSearchFieldDetails").setVisible(true)
                    me.byId("vpoBtnAddPRtoPO").setVisible(true)
                    me.byId("vpoBtnItemChanges").setVisible(true)
                    me.byId("vpoBtnRefreshDetails").setVisible(true)
                    me.byId("vpoBtnEditDetails").setVisible(true)
                    me.byId("vpoBtnDeleteDetails").setVisible(true)
                    me.byId("vpoBtnSaveLayoutDetails").setVisible(true)
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
                    // this.byId("vpoSearchFieldDetails").setVisible(true);
                    this.byId("vpoBtnAddPRtoPO").setVisible(true);
                    this.byId("vpoBtnItemChanges").setVisible(true);
                    this.byId("vpoBtnRefreshDetails").setVisible(true);
                    this.byId("vpoBtnEditDetails").setVisible(true);
                    this.byId("vpoBtnDeleteDetails").setVisible(true);
                    this.byId("vpoBtnSaveLayoutDetails").setVisible(true);
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
                    // this.byId("vpoSearchFieldDetails").setVisible(true);
                    this.byId("vpoBtnAddPRtoPO").setVisible(true);
                    this.byId("vpoBtnItemChanges").setVisible(true);
                    this.byId("vpoBtnRefreshDetails").setVisible(true);
                    this.byId("vpoBtnEditDetails").setVisible(true);
                    this.byId("vpoBtnDeleteDetails").setVisible(true);
                    this.byId("vpoBtnSaveLayoutDetails").setVisible(true);
                    this.byId("vpoBtnSaveDetails").setVisible(false);
                    this.byId("vpoBtnCancelDetails").setVisible(false);

                    // this.getView().getModel("TableData").setProperty("/", this._oDataBeforeChange);
                    _promiseResult = new Promise((resolve, reject)=>{
                        resolve(me.loadAllData());
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

            onAddPRtoPODtls: async function(){
                var me = this;
                var poNo = this._pono;
                var bProceed = true;

                var oModel = this.getOwnerComponent().getModel();

                var vendorCd = ''; 
                var purchOrg = '';
                var purchGrp = '';
                var shipToPlant = '';
                var purchPlant = '';
                var docType = '';

                var addPRToPOData = {};
                var oJSONModel = new JSONModel();
                var prToPOJSONModel = new JSONModel();
                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
                    MessageBox.information("PO is not valid for Add PR to PO.")
                    bProceed = false;
                }

                if(bProceed){
                    _promiseResult = new Promise((resolve, reject)=>{
                        oModel.read("/mainSet(PONO='" + poNo + "')", {
                            success: function (oData, oResponse) {
                                // if (oData.PODT !== null)
                                //     oData.PODT = dateFormat.format(new Date(oData.PODT));
                                vendorCd= oData.VENDOR; 
                                purchOrg= oData.PURCHORG;
                                purchGrp= oData.PURCHGRP;
                                shipToPlant= oData.SHIPTOPLANT;
                                purchPlant= oData.PURCHPLANT;
                                docType= oData.DOCTYPE
                                resolve();
                            },
                            error: function () {
                                bProceed = false;
                                resolve();
                            }
                        });
                    });
    
                    await _promiseResult;
                    
                    oModel.read("/VPOAddPRToPORscSet",{ 
                        urlParameters: {
                            "$filter": "VENDORCD eq '" + vendorCd + "' and PURCHORG eq '"+ purchOrg +"' and PURCHGRP eq '"+ purchGrp +"' and " +
                                    "SHIPTOPLANT eq '"+ shipToPlant +"' and PURCHPLANT eq '"+ purchPlant +"' and DOCTYP eq '"+ docType +"'"
                            // "$filter": "VENDORCD eq '0003101604' and PURCHORG eq '1601' and PURCHGRP eq '601' and SHIPTOPLANT eq 'B601' and PURCHPLANT eq 'C600' and DOCTYP eq 'ZMRP'"
                        },
                        success: async function (oData, oResponse) {
                            
                            console.log(oData);
                            addPRToPOData = {
                                Title: "Add PR To PO"
                            };
                            prToPOJSONModel.setData(addPRToPOData);

                            me.addPRToPODialog = sap.ui.xmlfragment(me.getView().getId(), "zuivendorpo.view.fragments.dialog.AddPRToPODialog", me);
                            me.addPRToPODialog.setModel(prToPOJSONModel);
                            me.getView().addDependent(me.addPRToPODialog);

                            oJSONModel.setData(oData);
                            me.getView().setModel(oJSONModel, "VPOAddPRtoPO");

                            //Add PR To PO
                            _promiseResult = new Promise((resolve, reject)=>{
                                resolve(me.getDynamicColumns('VPOADDPRTOPO','ZDV_VPOADDPRTOPO'));
                            });
                            await _promiseResult;

                            me.addPRToPODialog.open();
                        },
                        error: function () {
                        }
                    });
                }
            },
            onSaveAddPRtoPO: async function(){
                var me = this;
                var poNo = this._pono;

                var oTable = this.byId("vpoAddPRtoPOTbl");
                var aSelIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;

                var headerPOArr = [];

                var oParamInitParam = {};
                var oParamDataPO = [];
                var oParam;

                var rfcModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var oModel = this.getOwnerComponent().getModel();

                var message;
                var bProceed = true

                var poItemArr = [];
                var poItemLastCnt = 0;

                this.showLoadingDialog('Loading...')
                
                _promiseResult = new Promise((resolve, reject)=>{
                    oModel.read("/mainSet(PONO='" + poNo + "')", {
                        success: function (oData, oResponse) {
                            if (oData.PODT !== null)
                                oData.PODT = dateFormat.format(new Date(oData.PODT));
                            headerPOArr.push(oData);
                            resolve();
                        },
                        error: function () {
                            MessageBox.error("Error Encountered.")
                            bProceed = false;
                            resolve();
                        }
                    });
                });
                await _promiseResult;

                if(aSelIndices.length === 0 && bProceed){
                    MessageBox.error("No Selected Record!")
                    bProceed = false;
                }
                if(bProceed){
                    _promiseResult = new Promise((resolve, reject)=>{
                        resolve(me.getPODetails2(poNo));
                    });
                    await _promiseResult;

                    var poDtlsSet = this.getView().getModel("VPODtlsVPODet").getProperty('/results');  

                    for(var x = 0; x < poDtlsSet.length; x++){
                        poItemArr.push(poDtlsSet[x].ITEM);
                    }

                    poItemArr.sort(function(a, b){return b - a});
                    poItemLastCnt = poItemArr[0];

                    poItemLastCnt = String(parseInt(poItemLastCnt) + 10);

                    if(poItemLastCnt != "" || poItemLastCnt != null){
                        while(poItemLastCnt.length < 5) poItemLastCnt = "0" + poItemLastCnt.toString();
                        
                    }
                    
                    aSelIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    });
                    aSelIndices = oTmpSelectedIndices;
                    aSelIndices.forEach((item, index) => {
                        oParamInitParam = {
                            IPoNumber: poNo,
                            IDoDownload: "",
                            IChangeonlyHdrplants: "",
                        };
                        oParamDataPO.push({
                            Bedat     : sapDateFormat.format(new Date(headerPOArr[0].PODT)) + "T00:00:00", //PODocDt
                            Bsart     : headerPOArr[0].DOCTYPE, //PODocTyp
                            Banfn     : aData.at(item).PRNO, //PR
                            Bnfpo     : aData.at(item).PRITM, //PRITM
                            Ebeln     : poNo, //PONO
                            Ebelp     : poItemLastCnt, //POITM
                            Bukrs     : headerPOArr[0].COMPANY,//COCD
                            Werks     : headerPOArr[0].PURCHPLANT,//PLANTCD
                            Unsez     : "",//
                            Txz01     : "",//ShortText
                            Menge     : aData.at(item).QTY,//OrdQTY
                            Meins     : aData.at(item).UOM,//UOM
                            // Netpr     : resultExtendPop[0][x].NETPR,//NET ORD PRICE/
                            // Peinh     : resultExtendPop[0][x].PEINH,//NET UOM/
                            // Bprme     : resultExtendPop[0][x].BPRME,//ORD UOM/
                            // Repos     : resultExtendPop[0][x].REPOS,//INV RCPT/
                            // Webre     : resultExtendPop[0][x].WEBRE,//GR IND /
                            // Eindt     : sapDateFormat.format(new Date(delDt)) + "T00:00:00", //Delivery Date /
                            // Evers     : resultExtendPop[0][x].EVERS,//SHIPPINGINST /
                            // Uebto     : resultExtendPop[0][x].UEBTO,//OVERTOL /
                            // Untto     : resultExtendPop[0][x].UNTTO,//UNDERTOL /
                            // Uebtk     : resultExtendPop[0][x].UEBTK,//UNLIMITED /
                            // Elikz     : resultExtendPop[0][x].ELIKZ,//DLVCOMPLETE /
                            // DeleteRec : resultExtendPop[0][x].LOEKZ //DELETE /
                        });

                        poItemLastCnt = String(parseInt(poItemLastCnt) + 10);

                        if(poItemLastCnt != "" || poItemLastCnt != null){
                            while(poItemLastCnt.length < 5) poItemLastCnt = "0" + poItemLastCnt.toString();
                            
                        }
                        
                    });

                    oParam = oParamInitParam;
                    oParam['N_ChangePOItemParam'] = oParamDataPO;
                    oParam['N_ChangePOReturn'] = [];

                    _promiseResult = new Promise((resolve, reject)=>{
                        rfcModel.create("/ChangePOSet", oParam, {
                            method: "POST",
                            success: function(oData, oResponse){
                                if(oData.N_ChangePOReturn.results.length > 0){
                                    message = oData.N_ChangePOReturn.results[0].Msgv1;
                                    MessageBox.information(message);
                                    resolve()
                                }else{
                                    MessageBox.error("Error, No Data Changed");
                                    resolve()
                                }
                            },error: function(error){
                                MessageBox.error("Error, No Data Changed");
                                resolve()
                            }
                        })
                    });
                    await _promiseResult;
                }
                    
                this.closeLoadingDialog(that);
                
            },
            onCancelAddPRtoPO: async function(){
                this.addPRToPODialog.destroy(true);
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
                if(type === 'Remarks'){
                    _promiseResult = new Promise((resolve, reject)=>{
                        resolve(this.remarksTblLoad());
                    })
                    await _promiseResult;

                    this.byId("vpoEditHdrTxtRemarks").setVisible(false);
                    this.byId("vpoDeleteHdrTxtRemarks").setVisible(false);
                    this.byId("vpoSaveHdrTxtRemarks").setVisible(true);
                    this.byId("vpoCancelHdrTxtRemarks").setVisible(true);
                    
                    this.onRowEditPO("RemarksTbl", "VPORemarksCol");
                }
                if(type === 'PkgInst'){
                    _promiseResult = new Promise((resolve, reject)=>{
                        resolve(this.pkngInstTblLoad());
                    })
                    await _promiseResult;

                    this.byId("vpoEditHdrTxtPkgInst").setVisible(false);
                    this.byId("vpoDeleteHdrTxtPkgInst").setVisible(false);
                    this.byId("vpoSaveHdrTxtPkgInst").setVisible(true);
                    this.byId("vpoCancelHdrTxtPkgInst").setVisible(true);
                    
                    this.onRowEditPO("PackingInstTbl", "VPOPkngInstsCol");
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
            },

            onRefresh: async function(){
                this.showLoadingDialog('Loading...');
                _promiseResult = new Promise((resolve, reject)=> {
                    resolve(this.loadAllData());
                });
                await _promiseResult;
                this.closeLoadingDialog(that);
            },

            onCellClick: async function(oEvent) {
                var sRowPath = oEvent.getParameters().rowBindingContext.sPath;
                sRowPath = "/results/"+ sRowPath.split("/")[2];
                var oRow;
                var oTable;
                var poNo = this._pono;
                var me = this;

                if(oEvent.getParameters().id.includes("vpoDetailsTab")){
                    oRow = this.getView().getModel("VPODtlsVPODet").getProperty(sRowPath)
                    oTable = this.byId("vpoDetailsTab");

                    _promiseResult = new Promise((resolve, reject)=>{
                        oTable.getRows().forEach(row => {
                            if(row.getBindingContext().sPath.replace("/rows/", "") === sRowPath.split("/")[2]){
                                resolve(row.addStyleClass("activeRow"));
                            }else{
                                resolve(row.removeStyleClass("activeRow"));
                            }
                        });
                    });
                    await _promiseResult;
                }else if(oEvent.getParameters().id.includes("vpoDelSchedTab")){
                    oRow = this.getView().getModel("VPODelSchedVPODet").getProperty(sRowPath)
                    oTable = this.byId("vpoDelSchedTab");
                    
                    this.getView().getModel("ui").setProperty("/activePOItem", oRow.ITEM);
                    _promiseResult = new Promise((resolve, reject)=>{
                        oTable.getRows().forEach(row => {
                            if(row.getBindingContext().sPath.replace("/rows/", "") === sRowPath.split("/")[2]){
                                resolve(row.addStyleClass("activeRow"));
                            }else{
                                resolve(row.removeStyleClass("activeRow"));
                            }
                        });
                    });
                    await _promiseResult;
                }else if(oEvent.getParameters().id.includes("vpoDelInvTab")){
                    oRow = this.getView().getModel("VPODelInvVPODet").getProperty(sRowPath)
                    oTable = this.byId("vpoDelInvTab");

                    this.getView().getModel("ui").setProperty("/activePOItem", oRow.ITEM);                    
                    _promiseResult = new Promise((resolve, reject)=>{
                        oTable.getRows().forEach(row => {
                            if(row.getBindingContext().sPath.replace("/rows/", "") === sRowPath.split("/")[2]){
                                resolve(row.addStyleClass("activeRow"));
                            }else{
                                resolve(row.removeStyleClass("activeRow"));
                            }
                        });
                    });
                    await _promiseResult;
                }else if(oEvent.getParameters().id.includes("vpoPoHistTab")){
                    oRow = this.getView().getModel("VPOPOHistVPODet").getProperty(sRowPath)
                    oTable = this.byId("vpoPoHistTab");

                    this.getView().getModel("ui").setProperty("/activePOItem", oRow.ITEM);
                    _promiseResult = new Promise((resolve, reject)=>{
                        oTable.getRows().forEach(row => {
                            if(row.getBindingContext().sPath.replace("/rows/", "") === sRowPath.split("/")[2]){
                                resolve(row.addStyleClass("activeRow"));
                            }else{
                                resolve(row.removeStyleClass("activeRow"));
                            }
                        });
                    });
                    await _promiseResult;
                }else if(oEvent.getParameters().id.includes("vpoConditionsTab")){
                    oRow = this.getView().getModel("VPOCondVPODet").getProperty(sRowPath)
                    oTable = this.byId("vpoConditionsTab");
                    
                    _promiseResult = new Promise((resolve, reject)=>{
                        oTable.getRows().forEach(row => {
                            if(row.getBindingContext().sPath.replace("/rows/", "") === sRowPath.split("/")[2]){
                                resolve(row.addStyleClass("activeRow"));
                            }else{
                                resolve(row.removeStyleClass("activeRow"));
                            }
                        });
                    });
                    await _promiseResult;
                }
                
            },
            onKeyUp: async function(oEvent){
                var me = this;
                if ((oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") && oEvent.srcControl.sParentAggregationName === "rows"){// && _dataMode === "READ") {
                    var sRowPath = this.byId(oEvent.srcControl.sId).oBindingContexts["undefined"].sPath;
                    sRowPath = "/results/"+ sRowPath.split("/")[2];
                    var index = sRowPath.split("/");
                    var oRow;
                    var oTable;

                    if(oEvent.srcControl.sId.includes("vpoDetailsTab")){
                        oRow = this.getView().getModel("VPODtlsVPODet").getProperty(sRowPath);
                        oTable = this.byId("vpoDetailsTab")
                        _promiseResult = new Promise((resolve, reject)=>{
                            oTable.getRows().forEach(row => {
                                if(row.getBindingContext().sPath.replace("/rows/", "") === index[2]){
                                    resolve(row.addStyleClass("activeRow"));
                                }else{
                                    resolve(row.removeStyleClass("activeRow"));
                                }
                            });
                        });
                        await _promiseResult;

                    }else if(oEvent.srcControl.sId.includes("vpoDelSchedTab")){
                        oRow = this.getView().getModel("VPODelSchedVPODet").getProperty(sRowPath);
                        oTable = this.byId("vpoDelSchedTab")
                        this.getView().getModel("ui").setProperty("/activePOItem", oRow.ITEM)
                        _promiseResult = new Promise((resolve, reject)=>{
                            oTable.getRows().forEach(row => {
                                if(row.getBindingContext().sPath.replace("/rows/", "") === index[2]){
                                    resolve(row.addStyleClass("activeRow"));
                                }else{
                                    resolve(row.removeStyleClass("activeRow"));
                                }
                            });
                        });
                        await _promiseResult;

                    }else if(oEvent.srcControl.sId.includes("vpoDelInvTab")){
                        oRow = this.getView().getModel("VPODelInvVPODet").getProperty(sRowPath);
                        oTable = this.byId("vpoDelInvTab")
                        this.getView().getModel("ui").setProperty("/activePOItem", oRow.ITEM)
                        _promiseResult = new Promise((resolve, reject)=>{
                            oTable.getRows().forEach(row => {
                                if(row.getBindingContext().sPath.replace("/rows/", "") === index[2]){
                                    resolve(row.addStyleClass("activeRow"));
                                }else{
                                    resolve(row.removeStyleClass("activeRow"));
                                }
                            });
                        });
                        await _promiseResult;

                    }else if(oEvent.srcControl.sId.includes("vpoPoHistTab")){
                        oRow = this.getView().getModel("VPOPOHistVPODet").getProperty(sRowPath);
                        oTable = this.byId("vpoPoHistTab")
                        this.getView().getModel("ui").setProperty("/activePOItem", oRow.ITEM)
                        _promiseResult = new Promise((resolve, reject)=>{
                            oTable.getRows().forEach(row => {
                                if(row.getBindingContext().sPath.replace("/rows/", "") === index[2]){
                                    resolve(row.addStyleClass("activeRow"));
                                }else{
                                    resolve(row.removeStyleClass("activeRow"));
                                }
                            });
                        });
                        await _promiseResult;

                    }else if(oEvent.srcControl.sId.includes("vpoConditionsTab")){
                        oRow = this.getView().getModel("VPOCondVPODet").getProperty(sRowPath);
                        oTable = this.byId("vpoConditionsTab")
                        _promiseResult = new Promise((resolve, reject)=>{
                            oTable.getRows().forEach(row => {
                                if(row.getBindingContext().sPath.replace("/rows/", "") === index[2]){
                                    resolve(row.addStyleClass("activeRow"));
                                }else{
                                    resolve(row.removeStyleClass("activeRow"));
                                }
                            });
                        });
                        await _promiseResult;
                    }
                }
            },

            onSaveTableLayout: function (table) {
                var type;
                var tabName

                if(table == 'vpoDetailsTab'){
                    type = "VPODTLS";
                    tabName = "ZDV_3DERP_VPDTLS";
                }
                if(table == 'vpoDelSchedTab'){
                    type = "VPODELSCHED";
                    tabName = "ZVB_VPO_DELSCHED";
                }
                if(table == 'vpoDelInvTab'){
                    type = "VPODELINV";
                    tabName = "ZDV_3DERP_DELINV";
                }
                if(table == 'vpoPoHistTab'){
                    type = "VPOHISTORY";
                    tabName = "ZDV_3DERP_POHIST";
                }
                if(table == 'vpoConditionsTab'){
                    type = "VPOCOND";
                    tabName = "ZDV_3DERP_COND";
                }
                if(table == 'vpoAddPRtoPOTbl'){
                    type = "VPOADDPRTOPO";
                    tabName = "ZDV_VPOADDPRTOPO";
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
    
                //call the layout save
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
    
                oModel.create("/TableLayoutSet", oParam, {
                    method: "POST",
                    success: function(data, oResponse) {
                        console.log(data);
                        sap.m.MessageBox.information("Layout saved.");
                        //Common.showMessage(me._i18n.getText('t6'));
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(err);
                    }
                });                
            },
        });
    });
