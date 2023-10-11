sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "../js/Utils",
    "sap/ui/core/routing/HashChanger",
    'sap/m/SearchField',
    'sap/ui/model/type/String',
    "sap/m/Token"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, Filter, FilterOperator, MessageBox, Utils, HashChanger, SearchField, typeString, Token) {
        "use strict";

        var that;
        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
        var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });
        var _promiseResult;

        return Controller.extend("zuivendorpo.controller.main", {
            onInit: async function () {
                that = this;
                this._oModel = this.getOwnerComponent().getModel();

                if (sap.ui.getCore().byId("backBtn") !== undefined) {
                    this._fBackButton = sap.ui.getCore().byId("backBtn").mEventRegistry.press[0].fFunction;

                    var oView = this.getView();
                    oView.addEventDelegate({
                        onAfterShow: function(oEvent){
                            sap.ui.getCore().byId("backBtn").mEventRegistry.press[0].fFunction = that._fBackButton; 
                            
                            if (that._aParamLockPOdata.length > 0) {
                                that.onPOUnlock();
                            }
                        }
                    }, oView);
                }

                this._counts = {
                    unreleasedpo: 0,
                    openlineitems: 0,
                }
                this.getView().setModel(new JSONModel({
                    sbu: '',
                    activePONo:'',
                    activePOItem:'',
                    activeCondRec:'',
                    condMatNo: '',
                    condShortText: '',
                    activeDocTyp: ''
                }), "ui");

                var _oDelegateKeyUp = {
                    onkeyup: function(oEvent){
                        that.onKeyUp(oEvent);
                    }
                };
                
                this.byId("mainTab").addEventDelegate(_oDelegateKeyUp);
                this.byId("detailsTab").addEventDelegate(_oDelegateKeyUp);
                this.byId("delSchedTab").addEventDelegate(_oDelegateKeyUp);
                this.byId("delInvTab").addEventDelegate(_oDelegateKeyUp);
                this.byId("poHistTab").addEventDelegate(_oDelegateKeyUp);
                this.byId("conditionsTab").addEventDelegate(_oDelegateKeyUp);

                this._sbuChange = false;
                this._tblChange = false;
                var oJSONDataModel = new JSONModel(); 
                oJSONDataModel.setData(this._counts);
                this.getView().setModel(oJSONDataModel, "counts");
                
                this.setSmartFilterModel();

                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_VPO_FILTERS_CDS");
                oModel.read("/ZVB_3DERP_SBU_SH", {
                    success: function (oData, oResponse) {
                        if (oData.results.length === 1) {
                            // that.getView().getModel("ui").setProperty("/sbu", oData.results[0].SBU);
                            // that.getColumns("AUTO_INIT");
                        }
                        else {
                        }
                    },
                    error: function (err) { }
                });

                this._aEntitySet = {
                    main: "mainSet"
                };

                this._aColumns = {};
                this._columnLoadError = false;
                var _oComponent = this.getOwnerComponent();
                this._router = _oComponent.getRouter();
                this._router.getRoute("Routemain").attachPatternMatched(this._routePatternMatched, this);
                this.getView().setModel(new JSONModel({dataMode: 'NODATA',}), "ui");
                
                this._updUnlock = 1;
                this._zpoUnlock = 1;
                this._ediVendor; 
                this._aParamLockPOdata = [];

                this._tableFullScreenRender = "";

                //store PO Item/MatNo/ShortText for Condition Record arrow up and arrow down function
                this._condPOItemMatNoStore = []; //Store PO Items and Material No. 
                this._condPOItemCount = 0; //Store Count every time user click arrow button in Condition Table

                //store PO Item for PO History arrow up and arrow down function
                this._poHistPOItemStore = []; //Store PO Items. 
                this._poHistPOItemCount = 0; //Store Count every time user click arrow button in PO History

                this._isDBClickApplied = false;

                var nodeLanes = 
                {
                    "nodes": [],
                    "lanes": [
                        {
                            "id": "0",
                            "icon": "sap-icon://order-status",
                            "label": "Ordering",
                            "position": 0
                        }, {
                            "id": "1",
                            "icon": "sap-icon://shipping-status",
                            "label": "Goods Receiving",
                            "position": 1
                        }, {
                            "id": "2",
                            "icon": "sap-icon://payment-approval",
                            "label": "Invoicing",
                            "position": 2
                        }
                    ]
                }
                
                this.getView().setModel(new JSONModel(nodeLanes), "processFlow");
                this._appAction = "" //global variable of Application Action if Display or Change
                await this.getAppAction(); //Get the Application actions if Display or Change in LTD
                // this.getCols();
                // this.getMain();
                if(this._appAction === "display"){
                    this.byId("btnTabLayout").setVisible(false);
                    this.byId("btnColPropDetails").setVisible(false);
                    this.byId("btnColPropDelSched").setVisible(false);
                    this.byId("btnColPropDelInv").setVisible(false);
                    this.byId("btnColPropPOHistory").setVisible(false);
                    this.byId("btnColPropConditions").setVisible(false);

                    this.byId("_IDGenMenuButton3").setVisible(false);
                }

                this._oMultiInputDOCTYPE = this.getView().byId("multiInputDOCTYPE");
                this._oMultiInputDOCTYPE.addValidator(this._onMultiInputValidate.bind(this));

                this._oMultiInputPRNO = this.getView().byId("multiInputPRNO");
                this._oMultiInputPRNO.addValidator(this._onMultiInputValidate.bind(this));

                
                this.callCaptionsAPI();
                this.getPRNOSH([]);
            },

            _routePatternMatched: function (oEvent) {
                console.log("_routePatternMatched")
                this.setSmartFilterModel();
                this.onRefresh();
            },

            getAppAction: async function(){
                if(sap.ushell.Container !==undefined){
                    const fullHash = new HashChanger().getHash();
                    const urlParsing = await sap.ushell.Container.getServiceAsync("URLParsing");
                    const shellHash = urlParsing.parseShellHash(fullHash);
                    const sAction = shellHash.action;
                    this._appAction = sAction;
                }
            },
            setSmartFilterModel: function () {
                //Model StyleHeaderFilters is for the smartfilterbar
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_VPO_FILTERS_CDS");
                var oSmartFilter = this.getView().byId("smartFilterBar");
                oSmartFilter.setModel(oModel);
            },
            onSearch: async function(){
                var me = this;
                this.showLoadingDialog(this.getView().getModel("captionMsg").getData()["LOADING"]);
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(this.getMain());
                });
                await _promiseResult;
                
                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.getCols());
                });
                
                this.getDocTypSH([]);
                await _promiseResult;
                this.closeLoadingDialog();

            },

            getDocTypSH: function(aList){
                var me = this;
                var oJSONModel = new JSONModel();
                var iCounter = 0;
                var itemResult = [];
                var vSBU = this.getView().getModel("ui").getData().sbu;
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_VPO_FILTERS_CDS");
                //ZVB_3DERP_DOCTYPE_SH
                oModel.read("/ZVB_3DERP_DOCTYPE_SH", {
                    success: function (oData, oResponse) {
                        if(oData.results.length > 0){
                            for(var x = 0; x < oData.results.length; x++ ){
                                if(oData.results[x].SBU === vSBU){
                                    itemResult.push(oData.results[x]);
                                }
                            }

                            itemResult = {results: itemResult} 
                            var aDataFiltered = [];
                            aDataFiltered = itemResult.results;
            
                            var aData = new JSONModel({
                                results: aDataFiltered
                            });
                            me.getView().setModel(aData, "docTypSHSource");
                            
                        }else{
                                
                            var aData = new JSONModel({results: []});
                            me.getView().setModel(aData, "docTypSHSource");
                        }
                        
                    },
                    error: function (err) { 
                    }
                });
            },

            getPRNOSH: function(aList){
                var me = this;
                var oJSONModel = new JSONModel();
                var iCounter = 0;
                var itemResult = [];
                var vSBU = this.getView().getModel("ui").getData().sbu;
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_VPO_FILTERS_CDS");
                // ZVB_3DERP_PRNO_SH
                oModel.read("/ZVB_3DERP_PRNO_SH", {
                    success: function (oData, oResponse) {
                        if(oData.results.length > 0){
                            var aDataFiltered = [];
                            if (aList.length > 0) {
                                aList.forEach(item => {
                                    aDataFiltered.push(...oData.results.filter(x => x.DocType === item));
                                })
                            } else {
                                aDataFiltered = oData.results;
                            }
                            var aData = new JSONModel({
                                results: aDataFiltered
                            });
                            me.getView().setModel(aData, "prNoSHSource");
                        }else{
                            
                            var aData = new JSONModel({results: []});
                            me.getView().setModel(aData, "prNoSHSource");
                        }
                    },
                    error: function (err) { 
                    }
                });
            },
            onCustomSmartFilterValueHelp: function(oEvent){
                var oSource = oEvent.getSource();
                var sModel = oSource.mBindingInfos.suggestionRows.model;
                var oCustomSmartFilterModel;
                var oSmartField = {};

                if(sModel == "prNoSHSource"){
                    oSmartField = {
                        idLabel: "PR Number",
                        idName: "PRNumber"
                    }

                    this.oColModel = new JSONModel({
                        "cols": [
                            {
                                "label": "PR Number",
                                "template": "PRNumber",
                                "width": "20rem",
                                "sortProperty": "PRNumber"
                            }
                        ]
                    });

                    oCustomSmartFilterModel = new JSONModel({
                        "title": "PR Number",
                        "key": "PRNumber"
                    })
                }else if(sModel == "docTypSHSource"){
                    oSmartField = {
                        idLabel: "Document Type",
                        idName: "DocType"
                    }

                    this.oColModel = new JSONModel({
                        "cols": [
                            {
                                "label": "Document Type",
                                "template": "DocType",
                                "width": "20rem",
                                "sortProperty": "DocType"
                            },
                            {
                                "label": "Description",
                                "template": "Description",
                                "sortProperty": "Description"
                            },
                        ]
                    });

                    oCustomSmartFilterModel = new JSONModel({
                        "title": "Document Type",
                        "key": "DocType"
                    })
                }

                var aCols = this.oColModel.getData().cols;
                this._oBasicSearchField = new SearchField({
                    showSearchButton: false
                });

                this._oCustomSmartFilterValueHelpDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.valuehelp.SmartFilterValueHelpDialog", this);
                this.getView().addDependent(this._oCustomSmartFilterValueHelpDialog);

                this._oCustomSmartFilterValueHelpDialog.setModel(oCustomSmartFilterModel);
    
                this._oCustomSmartFilterValueHelpDialog.setRangeKeyFields([{
                    label: oSmartField.idLabel,
                    key: oSmartField.idName,
                    type: "string",
                    typeInstance: new typeString({}, {
                        maxLength: 4
                    })
                }]);

                this._oCustomSmartFilterValueHelpDialog.getTableAsync().then(function (oTable) {
                    oTable.setModel(this.getView().getModel(sModel));
                    oTable.setModel(this.oColModel, "columns");
                    if (oTable.bindRows) {
                        oTable.bindAggregation("rows", "/results");
                    }
    
                    if (oTable.bindItems) {
                        oTable.bindAggregation("items", "/results", function () {
                            return new ColumnListItem({
                                cells: aCols.map(function (column) {
                                    return new Label({ text: "{" + column.template + "}" });
                                })
                            });
                        });
                    }
    
                    this._oCustomSmartFilterValueHelpDialog.update();
                }.bind(this));

                if (sModel == "prNoSHSource") this._oCustomSmartFilterValueHelpDialog.setTokens(this._oMultiInputPRNO.getTokens());
                if (sModel == "docTypSHSource") this._oCustomSmartFilterValueHelpDialog.setTokens(this._oMultiInputDOCTYPE.getTokens());
                this._oCustomSmartFilterValueHelpDialog.open();
            },

            onCustomSmartFilterValueHelpOkPress: function (oEvent) {
                var me = this;
                var aTokens = oEvent.getParameter("tokens");
                var oSource = oEvent.getSource();
                var sKey = Object.values(oSource.oModels)[0].oData.key;
                //var oObject = oArgs.suggestionObject.getBindingContext(oSmartField.model).getObject(),

                aTokens.forEach(item => {
                    item.mProperties.text = item.mProperties.key;
                })

                if (sKey == "PRNumber") this._oMultiInputPRNO.setTokens(aTokens);
                else if(sKey == "DocType"){
                    this._oMultiInputDOCTYPE.setTokens(aTokens);

                    var aToken = this._oMultiInputDOCTYPE.getTokens();
                    var aList = [];

                    aToken.forEach(item => {
                        aList.push(item.mProperties.key);
                    });
                    
                    if (aList.length > 0)
                        me.getPRNOSH(aList);
                    else
                        me.getPRNOSH([]);
                }
                this._oCustomSmartFilterValueHelpDialog.close();
            },

            onCustomSmartFilterValueHelpCancelPress: function () {
                this._oCustomSmartFilterValueHelpDialog.close();
            },
    
            onCustomSmartFilterValueHelpAfterClose: function () {
                this._oCustomSmartFilterValueHelpDialog.destroy();
            },

            onFilterBarSearch: function (oEvent) {
                var me = this;
                var sSearchQuery = this._oBasicSearchField.getValue(),
                    aSelectionSet = oEvent.getParameter("selectionSet");
                
                var aFilters = aSelectionSet.reduce(function (aResult, oControl) {

                    var sKey = me._oCustomSmartFilterValueHelpDialog.getModel().oData.key;
                    if (oControl.getValue()) {
                        aResult.push(new Filter({
                            path: sKey, //oControl.getName(),
                            operator: FilterOperator.Contains,
                            value1: oControl.getValue()
                        }));
                    }

                    return aResult;
                }, []);
    
                this._filterTable(new Filter({
                    filters: aFilters,
                    and: true
                }));
            },

            _filterTable: function (oFilter) {
                var oValueHelpDialog = this._oCustomSmartFilterValueHelpDialog;
    
                oValueHelpDialog.getTableAsync().then(function (oTable) {
                    if (oTable.bindRows) {
                        oTable.getBinding("rows").filter(oFilter);
                    }
    
                    if (oTable.bindItems) {
                        oTable.getBinding("items").filter(oFilter);
                    }
    
                    oValueHelpDialog.update();
                });
            },

            _onMultiInputValidate: function(oArgs) {
                var oSmartField = {};

                if (oArgs.suggestionObject.sId.includes("multiInputPRNO")) {
                    oSmartField.model = "prNoSHSource";
                    oSmartField.id = "PRNumber";
                    oSmartField.desc = "DESCRIPTION";
                }else if (oArgs.suggestionObject.sId.includes("multiInputDOCTYPE")) {
                    oSmartField.model = "docTypSHSource";
                    oSmartField.id = "DocType";
                    oSmartField.desc = "Description";
                }

                var aToken;

                if (oSmartField.model == "prNoSHSource") aToken = this._oMultiInputPRNO.getTokens();
                else if (oSmartField.model == "docTypSHSource") aToken = this._oMultiInputDOCTYPE.getTokens();

                if (oArgs.suggestionObject) {
                    var oObject = oArgs.suggestionObject.getBindingContext(oSmartField.model).getObject(),
                        oToken = new Token();

                    oToken.setKey(oObject[oSmartField.id]);
                    //oToken.setText(oObject[oSmartField.desc] + " (" + oObject[oSmartField.id] + ")");
                    oToken.setText(oObject[oSmartField.id]);
                    aToken.push(oToken)

                    if (oSmartField.model == "prNoSHSource") {
                        this._oMultiInputPRNO.setTokens(aToken);
                        this._oMultiInputPRNO.setValueState("None");
                    }else if (oSmartField.model == "docTypSHSource") {
                        this._oMultiInputDOCTYPE.setTokens(aToken);
                        this._oMultiInputDOCTYPE.setValueState("None");
                    }
                }
                else if (oArgs.text !== "") {
                    if (oSmartField.model == "prNoSHSource") {
                        this._oMultiInputPRNO.setValueState("Error");
                    }else if (oSmartField.model == "docTypSHSource") {
                        this._oMultiInputDOCTYPE.setValueState("Error");
                    }
                }
                return null;
            },

            onCustomSmartFilterValueHelpChange: function(oEvent) {
                var me = this;
                var oSource = oEvent.getSource();
                if (oSource.sId.includes("multiInputPRNO")) {
                    if (oEvent.getParameter("value") === "") this._oMultiInputPRNO.setValueState("None");
                }else if (oSource.sId.includes("multiInputDOCTYPE")){
                    if (oEvent.getParameter("value") === "") this._oMultiInputDOCTYPE.setValueState("None");

                    var aToken = this._oMultiInputDOCTYPE.getTokens();
                    var aList = [];

                    aToken.forEach(item => {
                        aList.push(item.mProperties.key);
                    });

                    if (aList.length > 0)
                        me.getPRNOSH(aList);
                    else
                        me.getPRNOSH([]);
                }
            },

            onCustomSmartFilterValueHelpTokenUpdate: function(oEvent) {
                var oSource = oEvent.getSource();
                var oParameter = oEvent.getParameters();
                var me = this;

                if (oParameter.type == "removed") {
                    if (oSource.sId.includes("multiInputPRNO")) { } 
                }else if (oSource.sId.includes("multiInputDOCTYPE")) { 
                    var aToken = this._oMultiInputDOCTYPE.getTokens();
                    var aList = [];

                    aToken.forEach(item => {
                        if (oParameter.removedTokens.filter(x => x.mProperties.key == item.mProperties.key).length == 0) {
                            aList.push(item.mProperties.key);
                        }
                    });

                    if (aList.length > 0)
                        me.getPRNOSH(aList);
                    else
                        me.getPRNOSH([]);
                }
            },

            //Same as OnSearch
            onRefresh: async function(){
                var me = this;
                if(this.getView().getModel("ui").getData().dataMode === 'NODATA'){
                    return;
                }
                this.showLoadingDialog(this.getView().getModel("captionMsg").getData()["LOADING"]);
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(this.getMain());
                });
                await _promiseResult;                
                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.getCols());
                });
                await _promiseResult;

                this.getProcessFlow();
                this.closeLoadingDialog();                
            },
            onSearchHeader: async function(oEvent){
                if(this.getView().getModel("ui").getData().dataMode === 'NODATA'){
                    return;
                }
                var oTable = oEvent.getSource().oParent.oParent;
                var sTable = oTable.getBindingInfo("rows");
                var sQuery = oEvent.getParameter("query");

                var oFilter = null;
                var aFilter = [];
                var oTableSrc;
                var oColumnsModel;
                var oColumnsData;
                
                if (oTable.sId.includes("mainTab")) {
                    oTableSrc = this.byId("mainTab");
                    oColumnsModel = this.getView().getModel("VENDORPOColumns");
                    oColumnsData = oColumnsModel.getProperty('/');
                    if(sQuery && sQuery !== undefined) {
                        this.showLoadingDialog(this.getView().getModel("captionMsg").getData()["LOADING"]);
                        oTableSrc.getColumns().forEach((col, idx) => {
                            var sDataType = oColumnsData.filter(item => item.ColumnName === col.sId.split("-")[1])[0].ColumnName
        
                            if(sDataType != "DELETED" && sDataType != "UNLIMITED" && sDataType != "INVRCPTIND" && sDataType != "GRBASEDIVIND")
                                aFilter.push(new Filter(sDataType, FilterOperator.Contains, sQuery));
                            else
                                aFilter.push(new Filter(sDataType, FilterOperator.EQ, sQuery));
                        })
                        oFilter = new Filter(aFilter, false);
                        this.byId("mainTab").getBinding("rows").filter(oFilter, "Application");

                        var oSelectedIndices = this.byId("mainTab").getBinding("rows").aIndices;
                        var aData = this.byId("mainTab").getModel().getData().rows;

                        this.getView().getModel("ui").setProperty("/activePONo", aData.at(oSelectedIndices[0]).PONO);
                        this.getView().getModel("ui").setProperty("/activeCondRec", aData.at(oSelectedIndices[0]).CONDREC);
                        this.getView().getModel("ui").setProperty("/activeDocTyp", aData.at(oSelectedIndices[0]).DOCTYPE);

                        
                        var PONo = this.getView().getModel("ui").getProperty("/activePONo");
                        var condrec = this.getView().getModel("ui").getProperty("/activeCondRec");

                        _promiseResult = new Promise(async(resolve,reject)=> {
                        
                            this._tblChange = true;
                            await this.getPODetails2(PONo)
                            await this.getDelSchedule2(PONo)
                            await this.getDelInvoice2(PONo)
                            
                            var poItem = this.getView().getModel("ui").getProperty("/activePOItem");
                            await this.getPOHistory2(PONo, poItem)
                            await this.getConditions2(condrec, poItem)
                            resolve();
                        })
                        await _promiseResult;;
                        this.closeLoadingDialog();
                    }
                    if(sQuery === "" && sQuery !== undefined){
                        this.showLoadingDialog(this.getView().getModel("captionMsg").getData()["LOADING"]);
                        _promiseResult = new Promise((resolve, reject)=>{
                            resolve(this.getMain());
                        });
                        await _promiseResult;
                        
                        
                        _promiseResult = new Promise((resolve, reject)=>{
                            resolve(this.getCols());
                        });
                        await _promiseResult;
                        this.closeLoadingDialog();
                    }
                }
    
            },
            getMain: async function(){
                var oModel = this.getOwnerComponent().getModel();
                var me = this;
                var poNo;
                var condrec;
                var docType;
                // var aFilters = this.getView().byId("smartFilterBar").getFilters();
                var oResults = []
                var oCounter = 0;

                var vSBU = this.getView().getModel("ui").getData().sbu;

                var oSmartFilter = this.getView().byId("smartFilterBar").getFilters();
                var aFilters = [],
                    aFilter = [],
                    aCustomFilter = [],
                    aSmartFilter = [];

                if (oSmartFilter.length > 0)  {
                    // aFilters = oSmartFilter[0].aFilters;
                    oSmartFilter[0].aFilters.forEach(item => {
                        if (item.aFilters === undefined) {
                            aFilter.push(new Filter(item.sPath, item.sOperator, item.oValue1));
                        }
                        else {
                            aFilters.push(item);
                        }
                    })

                    if (aFilter.length > 0) { aFilters.push(new Filter(aFilter, false)); }
                }

                if (this.getView().byId("smartFilterBar")) {
                    var oCtrl = this.getView().byId("smartFilterBar").determineControlByName("DOCTYPE");

                    if (oCtrl) {
                        var aCustomFilter = [];

                        if (oCtrl.getTokens().length === 1) {
                            oCtrl.getTokens().map(function(oToken) {
                                aFilters.push(new Filter("DOCTYPE", FilterOperator.EQ, oToken.getKey()))
                            })
                        }
                        else if (oCtrl.getTokens().length > 1) {
                            oCtrl.getTokens().map(function(oToken) {
                                aCustomFilter.push(new Filter("DOCTYPE", FilterOperator.EQ, oToken.getKey()))
                            })

                            aFilters.push(new Filter(aCustomFilter));
                        }
                    }

                    oCtrl = this.getView().byId("smartFilterBar").determineControlByName("PRNO");

                    if (oCtrl) {
                        var aCustomFilter = [];

                        if (oCtrl.getTokens().length === 1) {
                            oCtrl.getTokens().map(function(oToken) {
                                aFilters.push(new Filter("PRNO", FilterOperator.EQ, oToken.getKey()))
                            })
                        }
                        else if (oCtrl.getTokens().length > 1) {
                            oCtrl.getTokens().map(function(oToken) {
                                aCustomFilter.push(new Filter("PRNO", FilterOperator.EQ, oToken.getKey()))
                            })

                            aFilters.push(new Filter(aCustomFilter));
                        }
                    }
                }

                if (aFilters.length > 0) {
                    aFilters[0].aFilters.forEach(item => {
                        if (item.sPath === 'VENDOR') {
                            if (!isNaN(item.oValue1)) {
                                while (item.oValue1.length < 10) item.oValue1 = "0" + item.oValue1;
                            }
                        }
                    })
                }

                aSmartFilter.push(new Filter(aFilters, true));

                return new Promise((resolve, reject) => {
                    oModel.read('/mainSet', {
                        filters: aSmartFilter,
                        success: function (data, response) {
                            if (data.results.length > 0) {
                                data.results.forEach(item =>{
                                    oCounter++
                                    if(item.SBU === vSBU){
                                        oResults.push(item)
                                    }

                                    if(oCounter === data.results.length){
                                        const filteredObj = oResults.reduce((acc, current) => {
                                            // Use the PONO value as the key for filtering.
                                            const key = current.PONO;
                                            
                                            // If the key doesn't exist in the accumulator (acc), add the current object.
                                            if (!acc[key]) {
                                                acc[key] = current;
                                            }
                                            
                                            return acc;
                                        }, {});
                                        const resultArray = Object.values(filteredObj);

                                        oResults = {"results": resultArray}

                                        oResults.results.sort(function(a,b) {
                                            return new Date(b.PODT) - new Date(a.PODT);
                                        });

                                        oResults.results.forEach(item => {
                                            item.PODT = dateFormat.format(new Date(item.PODT));
                                            item.UPDATEDDT = dateFormat.format(new Date(item.UPDATEDDT));
                                            item.CREATEDDT = dateFormat.format(new Date(item.CREATEDDT));
                                        })
                                        
                                        /*data.results.sort((a,b) => (a.GMC > b.GMC ? 1 : -1));*/
                                        if(oResults.results.length > 0){
                                            if(oResults.results[0].SBU === vSBU){
                                                poNo = oResults.results[0].PONO;
                                                condrec = oResults.results[0].CONDREC;
                                                docType = oResults.results[0].DOCTYPE;
                                            }else{
                                                poNo = "";
                                                condrec = "";
                                                docType = "";
                                            }
                                        }else{
                                            poNo = "";
                                            condrec = "";
                                            docType = "";
                                        }
                                        var oJSONModel = new sap.ui.model.json.JSONModel();
                                        oJSONModel.setData(oResults);
                                        me.getView().setModel(oJSONModel, "VPOHdr");
                                        me.getView().getModel("ui").setProperty("/activePONo", poNo);
                                        me.getView().getModel("ui").setProperty("/activeCondRec", condrec);
                                        me.getView().getModel("ui").setProperty("/activeDocTyp", docType)
                                        resolve(me.getCounts());
                                        resolve(me.getPODetails2(poNo));
                                        resolve(me.getDelSchedule2(poNo));
                                        resolve(me.getDelInvoice2(poNo));

                                        
                                        var poItem = me.getView().getModel("ui").getProperty("/activePOItem");
                                        resolve(me.getPOHistory2(poNo, poItem));
                                        resolve(me.getConditions2(condrec, poItem));
                                        resolve();
                                    }
                                })
                                
                            }
                            else {
                                me.getView().getModel("ui").setProperty("/activePONo", '');
                                me.getView().getModel("ui").setProperty("/activeCondRec", '');

                                me.getView().setModel(new JSONModel({
                                    results: []
                                }), "materials");
                                me.getView().setModel(new JSONModel({
                                    results: []
                                }), "VPOHdr");
                                me.getView().setModel(new JSONModel({
                                    results: []
                                }), "VPODtls");
                                me.getView().setModel(new JSONModel({
                                    results: []
                                }), "VPODelSched");
                                me.getView().setModel(new JSONModel({
                                    results: []
                                }), "VPODelInv");
                                me.getView().setModel(new JSONModel({
                                    results: []
                                }), "VPOPOHist");
                                me.getView().setModel(new JSONModel({
                                    results: []
                                }), "VPOCond");
                                resolve();
                            }
                            me.closeLoadingDialog();
                            resolve();
                        },
                        error: function (err) { 
                            //error message
                            MessageBox.error(me.getView().getModel("captionMsg").getData()["INFO_ERROR"])
                            console.log("Logs: Error Encountered!")
                            resolve();
                        }
                    });
                    
                    
                });
            },
            getCounts: async function () {
                var oModel = this.getOwnerComponent().getModel();
                var me = this;
                return new Promise((resolve, reject) => {
                    oModel.read('/VPOCountSet', {
                        success: function (data, response) {
                            me._counts.unreleasedpo = data.results.filter(item => item.Stat === "UNRELEASED").length;
                            me._counts.openlineitems = data.results.filter(item => item.Stat === "OPENLINE").length;
                            me.getView().getModel("counts").setData(me._counts);
                            resolve();
                        }
                    });
                });
            },
            
            getPOHistory2: async function(PONO, POITEM){
                var oModel = this.getOwnerComponent().getModel();
                var me = this;
                var tblChange = this._tblChange;
                var oJSONModel = new sap.ui.model.json.JSONModel();
                var objectData = [];
                return new Promise((resolve, reject)=>{
                    oModel.read('/VPOHistSet', { 
                        urlParameters: {
                            "$filter": "PONO eq '" + PONO + "' and ITEM2 eq '"+ POITEM +"'"
                        },
                        success: function (data, response) {
                            if (data.results.length > 0) {
                                data.results.forEach(item => {
                                    item.POSTDT = dateFormat.format(new Date(item.POSTDT));
                                })
                                objectData.push(data.results);
                                objectData[0].sort((a,b) => (a.ITEM2 > b.ITEM2) ? 1 : ((b.ITEM2 > a.ITEM2) ? -1 : 0));
                                oJSONModel.setData(data);
                            }
                            me.getView().setModel(oJSONModel, "VPOPOHist");
                            if(tblChange)
                                resolve(me.setTableColumnsData('VPOHISTORY'));
                            resolve();
                        },
                        error: function (err) {
                            me.getView().setModel(oJSONModel, "VPOPOHist");
                            if(tblChange)
                                resolve(me.setTableColumnsData('VPOHISTORY'));
                            resolve();
                        }
                    });
                });
            },
            getDelInvoice2: async function(PONO){
                var oModel = this.getOwnerComponent().getModel();
                var me = this;
                var tblChange = this._tblChange;
                var oJSONModel = new sap.ui.model.json.JSONModel();
                var objectData = [];
                return new Promise((resolve, reject)=>{
                    oModel.read('/VPODelInvSet', { 
                        urlParameters: {
                            "$filter": "PONO eq '" + PONO + "'"
                        },
                        success: function (data, response) {
                            if (data.results.length > 0) {
                                objectData.push(data.results);
                                objectData[0].sort((a,b) => (a.ITEM > b.ITEM) ? 1 : ((b.ITEM > a.ITEM) ? -1 : 0));
                                oJSONModel.setData(data);
                            }
                            me.getView().setModel(oJSONModel, "VPODelInv");
                            if(tblChange)
                                resolve(me.setTableColumnsData('VPODELINV'));
                            resolve();
                        },
                        error: function (err) { 
                           me.getView().setModel(oJSONModel, "VPODelInv");
                            if(tblChange)
                                resolve(me.setTableColumnsData('VPODELINV'));
                            resolve();
                        }
                    });
                });
                
            },
            getConditions2: async function(CONDREC, POITEM){
                var oModel = this.getOwnerComponent().getModel();
                var me = this;
                var tblChange = this._tblChange;
                var oJSONModel = new sap.ui.model.json.JSONModel();
                return new Promise((resolve, reject)=>{
                    oModel.read('/VPOConditionsSet', { 
                        urlParameters: {
                            "$filter": "KNUMV eq '" + CONDREC + "' and KPOSN eq '"+ POITEM +"'"
                        },
                        success: function (data, response) {
                            if (data.results.length > 0) {
                                oJSONModel.setData(data);
                            }
                            me.getView().setModel(oJSONModel, "VPOCond");
                            if(tblChange)
                                resolve(me.setTableColumnsData('VPOCOND'));
                            resolve();
                        },
                        error: function (err) { 
                           me.getView().setModel(oJSONModel, "VPOCond");
                            if(tblChange)
                                resolve(me.setTableColumnsData('VPOCOND'));
                            resolve();
                        }
                    });
                });
                
            },
            getDelSchedule2: async function(PONO){
                var oModel = this.getOwnerComponent().getModel();
                var me = this;
                var tblChange = this._tblChange;
                var oJSONModel = new sap.ui.model.json.JSONModel();
                var objectData = [];
                return new Promise((resolve, reject)=>{
                    oModel.read('/VPODelSchedSet', { 
                        urlParameters: {
                            "$filter": "PONO eq '" + PONO + "'"
                        },
                        success: function (data, response) {
                            if (data.results.length > 0) {
                                data.results.forEach(item => {
                                    item.DELDT = dateFormat.format(new Date(item.DELDT));
                                    item.ETD = dateFormat.format(new Date(item.ETD));
                                    item.ETDPORT = dateFormat.format(new Date(item.ETDPORT));
                                    item.ETAFTY = dateFormat.format(new Date(item.ETAFTY));
                                    item.EXFTY = dateFormat.format(new Date(item.EXFTY));
                                    item.CREATEDDT = dateFormat.format(new Date(item.CREATEDDT));
                                    item.UPDATEDDT = dateFormat.format(new Date(item.UPDATEDDT));
                                    // item.DELETED = item.DELETED === "" ? false : true;
                                })
                                objectData.push(data.results);
                                objectData[0].sort((a,b) => (a.ITEM > b.ITEM) ? 1 : ((b.ITEM > a.ITEM) ? -1 : 0));

                                oJSONModel.setData(data);
                            }
                            me.getView().setModel(oJSONModel, "VPODelSched");
                            if(tblChange)
                                resolve(me.setTableColumnsData('VPODELSCHED'));
                            resolve();
                        },
                        error: function (err) { 
                            me.getView().setModel(oJSONModel, "VPODelSched");
                            if(tblChange)
                                resolve(me.setTableColumnsData('VPODELSCHED'));
                            resolve();
                        }
                    });
                });
                
            },
            getPODetails2: async function(PONO){
                var oModel = this.getOwnerComponent().getModel();
                var me = this;

                this._condPOItemMatNoStore = [];
                this._poHistPOItemStore = [];
                var tblChange = this._tblChange;
                var oJSONModel = new sap.ui.model.json.JSONModel();
                var objectData = [];
                var poItem = "";
                return new Promise((resolve, reject)=>{
                    oModel.read('/VPODetailsSet', { 
                        urlParameters: {
                            "$filter": "PONO eq '" + PONO + "'"
                        },
                        success: function (data, response) {
                            if (data.results.length > 0) {
                                data.results.forEach(item => {
                                    item.DELDT = dateFormat.format(new Date(item.DELDT));
                                    item.DELETED = item.DELETED === "L" ? true : false;
                                    me._condPOItemMatNoStore.push({
                                        poItem: item.ITEM,
                                        matNo: item.MATNO,
                                        shortText: item.SHORTTEXT
                                    });

                                    me._poHistPOItemStore.push({
                                        poItem: item.ITEM,
                                    })
                                })
                                //sort by PO Item
                                me._condPOItemMatNoStore.sort(function(a, b) {
                                    return a.poItem.localeCompare(b.poItem);
                                });

                                //sort by PO Item
                                me._poHistPOItemStore.sort(function(a, b) {
                                    return a.poItem.localeCompare(b.poItem);
                                });
                                
                                objectData.push(data.results);
                                objectData[0].sort((a,b) => (a.ITEM > b.ITEM) ? 1 : ((b.ITEM > a.ITEM) ? -1 : 0));

                                oJSONModel.setData(data);
                                poItem = data.results[0].ITEM;
                                
                            }
                            var poItem = data.results[0].ITEM;
                            var matNo = data.results[0].MATNO;
                            var shortText = data.results[0].SHORTTEXT;
                            me.getView().getModel("ui").setProperty("/activePOItem", poItem);
                            me.getView().getModel("ui").setProperty("/condMatNo", matNo);
                            me.getView().getModel("ui").setProperty("/condShortText", shortText);
                            me.getView().setModel(oJSONModel, "VPODtls");
                            if(tblChange)
                                resolve(me.setTableColumnsData('VPODTLS'));
                            resolve();
                        },
                        error: function (err) {
                            me.getView().setModel(oJSONModel, "VPODtls");
                            if(tblChange)
                                resolve(me.setTableColumnsData('VPODTLS'));
                            resolve();
                        }
                    });
                });
            },
            setSmartFilterModel: function () {
                //Model StyleHeaderFilters is for the smartfilterbar
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_VPO_FILTERS_CDS");
                var oSmartFilter = this.getView().byId("smartFilterBar");
                oSmartFilter.setModel(oModel);
            },

            getCols: async function() {
                var oModel = this.getOwnerComponent().getModel();
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(this.getDynamicColumns('VENDORPO', 'ZDV_3DERP_VPO'));
                });
                await _promiseResult
                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(this.getDynamicColumns('VPODTLS', 'ZDV_3DERP_VPDTLS'));
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
            getDynamicColumns: async function(model, dataSource) {
                var me = this;
                var modCode = model;
                var tabName = dataSource;
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
                return new Promise((resolve, reject) => {
                    oModel.read("/ColumnsSet", {
                        success: async function (oData, oResponse) {

                            if (oData.results.length > 0) {
                                me._columnLoadError = false;
                                if (modCode === 'VENDORPO') {
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VENDORPOColumns");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                if (modCode === 'VPODTLS') {
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VPODTLSColumns");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                if (modCode === 'VPODELSCHED') {
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VPODELSCHEDColumns");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                if (modCode === 'VPODELINV') {
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VPODELINVColumns");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                if (modCode === 'VPOHISTORY') {
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VPOHISTORYColumns");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                if (modCode === 'VPOCOND') {
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VPOCONDColumns");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                me.getView().getModel("ui").setProperty("/dataMode", 'READ');

                            }else{
                                me._columnLoadError = true;
                                if (modCode === 'VENDORPO') {
                                    me.getView().setModel(oJSONColumnsModel, "VENDORPOColumns");
                                    me.setTableColumnsData(modCode);
                                    resolve();                                
                                }
                                if (modCode === 'VPODTLS') {
                                    me.getView().setModel(oJSONColumnsModel, "VPODTLSColumns");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                if (modCode === 'VPODELSCHED') {
                                    me.getView().setModel(oJSONColumnsModel, "VPODELSCHEDColumns");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                if (modCode === 'VPODELINV') {
                                    me.getView().setModel(oJSONColumnsModel, "VPODELINVColumns");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                if (modCode === 'VPOHISTORY') {
                                    me.getView().setModel(oJSONColumnsModel, "VPOHISTORYColumns");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                if (modCode === 'VPOCOND') {
                                    me.getView().setModel(oJSONColumnsModel, "VPOCONDColumns");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                me.getView().getModel("ui").setProperty("/dataMode", 'NODATA');
                                me.getView().getModel("ui").setProperty("/activePONo", "");
                                me.getView().getModel("ui").setProperty("/activePOItem", "");
                                MessageBox.error(me.getView().getModel("captionMsg").getData()["INFO_NO_LAYOUT"])
                            }
                        },
                        error: function (err) {
                            //error message
                            MessageBox.error(me.getView().getModel("captionMsg").getData()["INFO_ERROR"])
                            me._columnLoadError = true;
                            if (modCode === 'VENDORPO') {
                                me.getView().setModel(oJSONColumnsModel, "VENDORPOColumns");
                                me.setTableColumnsData(modCode);
                                resolve();                                
                            }
                            if (modCode === 'VPODTLS') {
                                me.getView().setModel(oJSONColumnsModel, "VPODTLSColumns");
                                me.setTableColumnsData(modCode);
                                resolve();
                            }
                            if (modCode === 'VPODELSCHED') {
                                me.getView().setModel(oJSONColumnsModel, "VPODELSCHEDColumns");
                                me.setTableColumnsData(modCode);
                                resolve();
                            }
                            if (modCode === 'VPODELINV') {
                                me.getView().setModel(oJSONColumnsModel, "VPODELINVColumns");
                                me.setTableColumnsData(modCode);
                                resolve();
                            }
                            if (modCode === 'VPOHISTORY') {
                                me.getView().setModel(oJSONColumnsModel, "VPOHISTORYColumns");
                                me.setTableColumnsData(modCode);
                                resolve();
                            }
                            if (modCode === 'VPOCOND') {
                                me.getView().setModel(oJSONColumnsModel, "VPOCONDColumns");
                                me.setTableColumnsData(modCode);
                                resolve();
                            }
                            me.getView().getModel("ui").setProperty("/dataMode", 'NODATA');
                            me.getView().getModel("ui").setProperty("/activePONo", "");
                            me.getView().getModel("ui").setProperty("/activePOItem", "");
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
                
                if (modCode === 'VENDORPO') {     
                    oColumnsModel = this.getView().getModel("VPOHdr");  
                    oDataModel = this.getView().getModel("VENDORPOColumns"); 

                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');
                    
                    if(this._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');                 
                    this.addColumns("mainTab", oColumnsData, oData, "VPOHdr");
                    if(!this._isDBClickApplied){
                        //double click event
                        this.byId("mainTab").attachBrowserEvent('dblclick',function(e){
                            me._isDBClickApplied = true;
                            var PONo = me.getView().getModel("ui").getProperty("/activePONo");
                            // var CONDREC = me.getView().getModel("ui").getProperty("/activeCondRec");
                            var SBU = me.getView().getModel("ui").getData().sbu;
                            console.log(PONo);
                            e.preventDefault();
                            console.log(me.getView().getModel("ui").getData().dataMode);
                            if(me.getView().getModel("ui").getData().dataMode === 'READ'){
                                me.navToDetail(PONo, SBU); //navigate to detail page
                            }
                        });
                    }
                }
                if (modCode === 'VPODTLS') {
                    oColumnsModel = this.getView().getModel("VPODtls");  
                    oDataModel = this.getView().getModel("VPODTLSColumns"); 
                    var docType = this.getView().getModel("ui").getData().activeDocTyp;
                    
                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');

                    if(this._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');   
                    if(docType === "ZVAS" || docType === "ZSUR"){
                        oColumnsData.forEach((item, index) =>{
                            if(item.ColumnName === "GMCDESC"){
                                item.Visible = false;
                            }
                            if(item.ColumnName === "ADDTLDESC"){
                                item.Visible = false;
                            }
                            if(item.ColumnName === "MERCHMATDESC"){
                                item.Visible = false;
                            }
                            if(item.ColumnName === "SHORTTEXT"){
                                item.Visible = true;
                            }
                        })
                    }else{
                        if(oColumnsData.length > 0 || oColumnsData.length !== undefined){
                            oColumnsData.forEach((item, index) =>{
                                if(item.ColumnName === "GMCDESC"){
                                    item.Visible = true;
                                }
                                if(item.ColumnName === "ADDTLDESC"){
                                    item.Visible = true;
                                }
                                if(item.ColumnName === "MERCHMATDESC"){
                                    item.Visible = true;
                                }
                                if(item.ColumnName === "SHORTTEXT"){
                                    item.Visible = false;
                                }
                            })
                        }
                    }

                    this.addColumns("detailsTab", oColumnsData, oData, "VPODtls");
                    this.getProcessFlow();
                }
                if (modCode === 'VPODELSCHED') {
                    oColumnsModel = this.getView().getModel("VPODelSched");  
                    oDataModel = this.getView().getModel("VPODELSCHEDColumns"); 
                    
                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');

                    if(this._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');   
                    this.addColumns("delSchedTab", oColumnsData, oData, "VPODelSched");
                }
                if (modCode === 'VPODELINV') {
                    oColumnsModel = this.getView().getModel("VPODelInv");  
                    oDataModel = this.getView().getModel("VPODELINVColumns"); 
                    
                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');

                    if(this._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');   
                    this.addColumns("delInvTab", oColumnsData, oData, "VPODelInv");
                }
                if (modCode === 'VPOHISTORY') {
                    oColumnsModel = this.getView().getModel("VPOPOHist");  
                    oDataModel = this.getView().getModel("VPOHISTORYColumns"); 
                    
                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');

                    if(this._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');   
                    this.addColumns("poHistTab", oColumnsData, oData, "VPOPOHist");
                }
                if (modCode === 'VPOCOND') {
                    oColumnsModel = this.getView().getModel("VPOCond");  
                    oDataModel = this.getView().getModel("VPOCONDColumns"); 
                    
                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');

                    if(this._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');   
                    this.addColumns("conditionsTab", oColumnsData, oData, "VPOCond");
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

                    // if (table === "detailsTab" && sColumnId === "PRNO") {
                    //     var oControl = new sap.m.Link({
                    //         text: "{" + sColumnId + "}",
                    //         wrapping: false, 
                    //         tooltip: "{" + sColumnId + "}",
                    //         press: function(oEvent) {
                    //             // console.log(oEvent.oSource)
                    //             const vRow = oEvent.oSource.getBindingInfo("text").binding.getContext().sPath;
                    //             const vPRNo =  oEvent.oSource.mProperties.text;
                    //             const vPRItem =  oTable.getModel().getProperty(vRow + "/PRITM");
                    //             // console.log(vPRNo, vPRItem);
                    //             var oData = {
                    //                 DOCTYPE: "PR",
                    //                 PRNO: vPRNo,
                    //                 PRITEM: vPRItem
                    //             }

                    //             me.viewDoc(oData);

                    //             // window.open(`https://ltd.luenthai.com:44300/sap/bc/ui2/flp?sap-client=888#ZSO_3DERP_PUR_PR-dispaly&/PRDetail/VER/5000000487/00010` , "_blank");
                    //         },
                    //     })
                    //     oControl.addStyleClass("hyperlink");

                    //     return new sap.ui.table.Column({
                    //         id: model+"-"+sColumnId,
                    //         label: sColumnLabel,
                    //         template: oControl,
                    //         width: sColumnWidth + "px",
                    //         hAlign: me.columnSize(sColumnId),
                    //         sortProperty: sColumnId,
                    //         filterProperty: sColumnId,
                    //         autoResizable: true,
                    //         visible: sColumnVisible,
                    //         sorted: sColumnSorted,
                    //         sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                    //     });
                    // }
                    // else if (table === "poHistTab" && sColumnId === "MATDOC") {
                    //     var oControl = new sap.m.Link({
                    //         text: "{" + sColumnId + "}",
                    //         wrapping: false, 
                    //         tooltip: "{" + sColumnId + "}",
                    //         press: function(oEvent) {
                    //             // console.log(oEvent.oSource)
                    //             const vRow = oEvent.oSource.getBindingInfo("text").binding.getContext().sPath;
                    //             const vMatDocNo =  oEvent.oSource.mProperties.text;
                    //             const vMatDocItem =  oTable.getModel().getProperty(vRow + "/ITEM");
                    //             const vMatDocYr =  oTable.getModel().getProperty(vRow + "/MATDOCYR");
                    //             const vPONo =  oTable.getModel().getProperty(vRow + "/PONO");
                    //             const vPOItem =  oTable.getModel().getProperty(vRow + "/ITEM2");

                    //             var oData = {
                    //                 DOCTYPE: "MAT",
                    //                 MBLNR: vMatDocNo,
                    //                 MJAHR: vMatDocYr,
                    //                 ZEILE: vMatDocItem,
                    //                 EBELN: vPONo,
                    //                 EBELP: vPOItem
                    //             }

                    //             me.viewDoc(oData);
                    //         },
                    //     })
                    //     oControl.addStyleClass("hyperlink");

                    //     return new sap.ui.table.Column({
                    //         id: model+"-"+sColumnId,
                    //         label: sColumnLabel,
                    //         template: oControl,
                    //         width: sColumnWidth + "px",
                    //         hAlign: me.columnSize(sColumnId),
                    //         sortProperty: sColumnId,
                    //         filterProperty: sColumnId,
                    //         autoResizable: true,
                    //         visible: sColumnVisible,
                    //         sorted: sColumnSorted,
                    //         sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                    //     });
                    // }
                    if (sColumnType === "STRING" || sColumnType === "DATETIME"|| sColumnType === "BOOLEAN") {                        
                        return new sap.ui.table.Column({
                            id: model+"-"+sColumnId,
                            label: sColumnLabel,
                            template: me.columnTemplate(sColumnId, sColumnType), //default text
                            width: sColumnWidth + "px",
                            hAlign: me.columnSize(sColumnId),
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
                            template: new sap.m.Text({ 
                                text: {
                                    path: sColumnId,
                                    columnType: sColumnType
                                },
                                wrapping: false, 
                                tooltip: "{" + sColumnId + "}" 
                            }), //default text
                            width: sColumnWidth + "px",
                            hAlign: "End",
                            sortProperty: sColumnId,
                            filterProperty: sColumnId,
                            autoResizable: true,
                            visible: sColumnVisible,
                            sorted: sColumnSorted,
                            sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                        });
                    }

                });

                //sorting with Date Sort
                oTable.attachSort(function(oEvent) {
         
                    var sPath = oEvent.getParameter("column").getSortProperty();
                    var bDescending = false;
                    
                    oEvent.getParameter("column").setSorted(true); //sort icon initiator
                    if (oEvent.getParameter("sortOrder") == "Descending") {
                        bDescending = true;
                        oEvent.getParameter("column").setSortOrder("Descending") //sort icon Descending
                    }else{
                        oEvent.getParameter("column").setSortOrder("Ascending") //sort icon Ascending
                    }

                    var oSorter = new sap.ui.model.Sorter(sPath, bDescending ); //sorter(columnData, If Ascending(false) or Descending(True))
                    
                    var columnType = oEvent.getParameter("column").getTemplate().getBindingInfo("text") === undefined ? "" : oEvent.getParameter("column").getTemplate().getBindingInfo("text").columnType;
                    if (columnType === "DATETIME") {
                        oSorter.fnCompare = function(a, b) {
                        
                            // parse to Date object
                            var aDate = new Date(a);
                            var bDate = new Date(b);
                            
                            if (bDate == null) {
                                return -1;
                            }
                            if (aDate == null) {
                                return 1;
                            }
                            if (aDate < bDate) {
                                return -1;
                            }
                            if (aDate > bDate) {
                                return 1;
                            }
                            return 0;
                        };
                    } 
                    
                    oTable.getBinding('rows').sort(oSorter);
                     // prevent internal sorting by table
                    oEvent.preventDefault();
         
         
                });
                //bind the data to the table
                oTable.bindRows("/rows");
                
            },
            columnTemplate: function(sColumnId, sColumnType){
                var oColumnTemplate;
                
                oColumnTemplate = new sap.m.Text({ 
                    text: {
                        path: sColumnId,
                        columnType: sColumnType
                    }, 
                    wrapping: false, 
                    tooltip: "{" + sColumnId + "}" 
                }); //default text
                
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
                if (sColumnId === "UNLIMITED" || sColumnId === "INVRCPT" || sColumnId === "GRBASEDIV" || sColumnId === "GRIND") { 
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
                if (sColumnId === "DELCOMPLETE") { 
                    //Manage button
                    oColumnTemplate = new sap.m.CheckBox({
                        selected: "{" + sColumnId + "}",
                        editable: false
                    });
                }

                if (sColumnId === "UPDATEDDT") { 
                    //Manage button
                    oColumnTemplate = new sap.m.DatePicker({
                        displayFormat:"short",
                        value: "{path: '" + sColumnId + "'}",
                    });
                }
    
                return oColumnTemplate;
            },
            columnSize: function(sColumnId){
                var oColumnSize;
                if (sColumnId === "DELETED") { 
                    //Manage button
                    oColumnSize = "Center";
                }
                if (sColumnId === "CLOSED") { 
                    //Manage button
                    oColumnSize = "Center";
                }
                if (sColumnId === "UNLIMITED" || sColumnId === "INVRCPT" || sColumnId === "GRBASEDIV" || sColumnId === "GRIND") { 
                    //Manage button
                    oColumnSize = "Center";
                }
                if (sColumnId === "INVRCPTIND") { 
                    //Manage button
                    oColumnSize = "Center";
                }
                if (sColumnId === "GRBASEDIVIND") { 
                    //Manage button
                    oColumnSize = "Center";
                }
                if (sColumnId === "OVERDELTOL") { 
                    //Manage button
                    oColumnSize = "Center";
                }
                if (sColumnId === "UNDERDELTOL") { 
                    //Manage button
                    oColumnSize = "Center";
                }
                return oColumnSize;
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

                this._updUnlock = 0;
                this.navToDetail(PONo, SBU);
                
            },
            navToDetail: async function(PONo, SBU){
                var me = this;

                // if(CONDREC === undefined || CONDREC === "" || CONDREC ===null){
                //     MessageBox.error("PO: "+ PONo +" has no Condition Record!")
                // }else{
                var oJSONModel = new JSONModel();
                this._aParamLockPOdata = [];

                this._aParamLockPOdata.push({
                    Pono: PONo
                });
                if(this._appAction === "display"){
                    oJSONModel.setData(this.getView().getModel("captionMsg").getData());
                    this._router.navTo("vendorpodetail", {
                        PONO: PONo,
                        // CONDREC: CONDREC,
                        SBU: SBU
                    });
                }
                else{
                    if(await this.onPOLock()){
                        oJSONModel.setData(this.getView().getModel("captionMsg").getData());
                        this._router.navTo("vendorpodetail", {
                            PONO: PONo,
                            // CONDREC: CONDREC,
                            SBU: SBU
                        });
                    }
                }
                // await this.onPOUnlock(PONo);
                // }
            },
            onSaveTableLayout: function (table) {
                var type;
                var tabName
                if(this.getView().getModel("ui").getData().dataMode === 'NODATA'){
                    return;
                }

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
                if(table == 'conditionsTab'){
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
                        sap.m.MessageBox.information(me.getView().getModel("captionMsg").getData()["SAVELAYOUT"]);
                        //Common.showMessage(me._i18n.getText('t6'));
                    },
                    error: function(err) {
                        //layout error message
                        MessageBox.error(me.getView().getModel("captionMsg").getData()["INFO_NO_LAYOUT"])
                    }
                });                
            },
            onSelectionChange: async function(oEvent){
                var sRowPath = oEvent.getParameter("rowContext");
                sRowPath = "/results/"+ sRowPath.getPath().split("/")[2];
                var selPath = this.byId(oEvent.getParameters().id).mProperties.selectedIndex;
                var oRow;
                var oTable;
                var PONo = this.getView().getModel("ui").getProperty("/activePONo")
                var condrec = this.getView().getModel("ui").getProperty("/activeCondRec")
                var me = this;
                if(oEvent.getParameters().id.includes("mainTab")){
                    oRow = this.getView().getModel("VPOHdr").getProperty(sRowPath)
                    oTable = this.byId("mainTab");
                    this.getView().getModel("ui").setProperty("/activePONo", oRow.PONO);
                    this.getView().getModel("ui").setProperty("/activeCondRec", oRow.CONDREC);
                    this.getView().getModel("ui").setProperty("/activeDocTyp", oRow.DOCTYPE)

                    PONo = this.getView().getModel("ui").getProperty("/activePONo");
                    condrec = this.getView().getModel("ui").getProperty("/activeCondRec");
                    _promiseResult = new Promise(async(resolve,reject)=> {
                        
                        me._tblChange = true;
                        await me.getPODetails2(PONo)
                        await me.getDelSchedule2(PONo)
                        await me.getDelInvoice2(PONo)
                        
                        var poItem = me.getView().getModel("ui").getProperty("/activePOItem");
                        await me.getPOHistory2(PONo, poItem)
                        await me.getConditions2(condrec, poItem)
                        resolve();
                    })
                    await _promiseResult;;
    
                    _promiseResult = new Promise((resolve, reject)=>{
                        oTable.getRows().forEach(row => {
                            if(row.getBindingContext().sPath.replace("/rows/", "") === sRowPath.split("/")[2]){
                                resolve(row.addStyleClass("activeRow"));
                                oTable.setSelectedIndex(selPath);
                            }else{
                                resolve(row.removeStyleClass("activeRow"));
                            }
                        });
                    });
                    await _promiseResult;
                    this._tblChange = false;
                }
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
                    var index = sRowPath.split("/");
                    var oRow;
                    var oTable;

                    if(oEvent.srcControl.sId.includes("mainTab")){
                        oRow = this.getView().getModel("VPOHdr").getProperty(sRowPath);
                        oTable = this.byId("mainTab")
                        this.getView().getModel("ui").setProperty("/activePONo", oRow.PONO)
                        this.getView().getModel("ui").setProperty("/activeCondRec", oRow.CONDREC)
                        this.getView().getModel("ui").setProperty("/activeDocTyp", oRow.DOCTYPE)

                        _promiseResult = new Promise((resolve,reject)=> {
                            
                            me._tblChange = true;
                            resolve(me.getPODetails2(oRow.PONO));
                            resolve(me.getDelSchedule2(oRow.PONO));
                            resolve(me.getDelInvoice2(oRow.PONO));

                            
                            var poItem = me.getView().getModel("ui").getProperty("/activePOItem");
                            resolve(me.getPOHistory2(oRow.PONO, poItem));
                            resolve(me.getConditions2(oRow.CONDREC, poItem));
                            oTable.getRows().forEach(row => {
                                if(row.getBindingContext().sPath.replace("/rows/", "") === index[2]){
                                    resolve(row.addStyleClass("activeRow"));
                                }else{
                                    resolve(row.removeStyleClass("activeRow"));
                                }
                            });
                        })
                        await _promiseResult;

                        this.getProcessFlow();
                        this._tblChange = false;
                    }else if(oEvent.srcControl.sId.includes("detailsTab")){
                        oRow = this.getView().getModel("VPODtls").getProperty(sRowPath);
                        oTable = this.byId("detailsTab")
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

                    }else if(oEvent.srcControl.sId.includes("delSchedTab")){
                        oRow = this.getView().getModel("VPODelSched").getProperty(sRowPath);
                        oTable = this.byId("delSchedTab")
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

                    }else if(oEvent.srcControl.sId.includes("delInvTab")){
                        oRow = this.getView().getModel("VPODelInv").getProperty(sRowPath);
                        oTable = this.byId("delInvTab")
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

                    }else if(oEvent.srcControl.sId.includes("poHistTab")){
                        oRow = this.getView().getModel("VPOPOHist").getProperty(sRowPath);
                        oTable = this.byId("poHistTab")
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

                    }else if(oEvent.srcControl.sId.includes("conditionsTab")){
                        oRow = this.getView().getModel("VPOCond").getProperty(sRowPath);
                        oTable = this.byId("conditionsTab")
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

                    // _promiseResult = new Promise((resolve, reject)=>{
                        
                    //     oTable.getRows().forEach(row => {
                    //         if(row.getBindingContext().sPath.replace("/rows/", "") === index[2]){
                    //             resolve(row.addStyleClass("activeRow"));
                    //         }else{
                    //             resolve(row.removeStyleClass("activeRow"));
                    //         }
                    //     });
                    // });
                    // await _promiseResult;
                     //oEvent.srcControl.sId.split("rows")[1].split("-row")[1];
                    // console.log(sRowPath);
                    // console.log(oEvent.srcControl.sId);
                    // console.log(oEvent.srcControl.sId.split("rows")[1].split("-row")[1]);
                    // console.log(this.byId(oEvent.srcControl.sId).oBindingContexts["undefined"]);
                    
                    // oTable.setSelectedIndex(parseInt(index[2]));
                }
            },

            onKeyUpDelInv: async function(){
                var me = this;
                var count = 0;
                var oRow = this.getView().getModel("VPODelInv");
                var oTable = this.byId("delInvTab");
                var iSelectedIndex = oTable.getSelectedIndex();
                var poItem = this.getView().getModel("ui").getProperty("/activePOItem");
                if (iSelectedIndex > 0) {
                    var selectedIndexCount = iSelectedIndex - 1;
                    let sPath = "/results/"+ selectedIndexCount +""
                    oRow = this.getView().getModel("VPODelInv").getProperty(sPath);
                    oTable.setSelectedIndex(iSelectedIndex - 1);
                    this.getView().getModel("ui").setProperty("/activePOItem", oRow.ITEM)
                }

            },

            onKeyDownDelInv: async function(){
                var me = this;
                var count = 0;
                var oRow = this.getView().getModel("VPODelInv");
                var oTable = this.byId("delInvTab");
                var iSelectedIndex = oTable.getSelectedIndex();
                var iVisibleRowCount = oTable.getVisibleRowCount();
                var poItem = this.getView().getModel("ui").getProperty("/activePOItem");
                if (iSelectedIndex < iVisibleRowCount - 1) {
                    var selectedIndexCount = iSelectedIndex + 1;
                    let sPath = "/results/"+ selectedIndexCount +""
                    oRow = this.getView().getModel("VPODelInv").getProperty(sPath);
                    oTable.setSelectedIndex(iSelectedIndex + 1);
                    this.getView().getModel("ui").setProperty("/activePOItem", oRow.ITEM)
                }
            },

            onKeyUpPOHistory: async function(){
                var me = this;
                var poNo = this.getView().getModel("ui").getProperty("/activePONo");

                if (this._poHistPOItemCount <= 0) {
                    this._poHistPOItemCount++;
                }
                if(this._poHistPOItemCount <= this._poHistPOItemStore.length){
                    this._poHistPOItemCount--;
                    var poItem = this._poHistPOItemStore[this._poHistPOItemCount].poItem;
                    var matNo = this._poHistPOItemStore[this._poHistPOItemCount].matNo;
                    var shortText = this._poHistPOItemStore[this._poHistPOItemCount].shortText;

                    this.getView().getModel("ui").setProperty("/activePOItem", poItem);
                    await this.getPOHistory2(poNo, poItem)
                    await this.setTableColumnsData("VPOHISTORY");
                    
                }
            },
            onKeyDownPOHistory: async function(){
                var me = this;
                var poNo = this.getView().getModel("ui").getProperty("/activePONo");
                
                if (this._poHistPOItemCount ===  this._poHistPOItemStore.length -1) {
                    this._poHistPOItemCount--;
                }

                if(this._poHistPOItemCount != this._poHistPOItemStore.length - 1){
                    this._poHistPOItemCount++;
                    var poItem = this._poHistPOItemStore[this._poHistPOItemCount].poItem;
                    var matNo = this._poHistPOItemStore[this._poHistPOItemCount].matNo;
                    var shortText = this._poHistPOItemStore[this._poHistPOItemCount].shortText;

                    this.getView().getModel("ui").setProperty("/activePOItem", poItem);
                    await this.getPOHistory2(poNo, poItem)
                    await this.setTableColumnsData("VPOHISTORY");
                    
                }
            },

            onKeyUpCond: async function(){
                var me = this;
                var condrec = this.getView().getModel("ui").getProperty("/activeCondRec");
                if (this._condPOItemCount <= 0) {
                    this._condPOItemCount++;
                }
                if(this._condPOItemCount <= this._condPOItemMatNoStore.length){
                    this._condPOItemCount--;
                    var poItem = this._condPOItemMatNoStore[this._condPOItemCount].poItem;
                    var matNo = this._condPOItemMatNoStore[this._condPOItemCount].matNo;
                    var shortText = this._condPOItemMatNoStore[this._condPOItemCount].shortText;

                    this.getView().getModel("ui").setProperty("/activePOItem", poItem);
                    this.getView().getModel("ui").setProperty("/condMatNo", matNo);
                    this.getView().getModel("ui").setProperty("/condShortText", shortText);
                    await this.getConditions2(condrec, poItem)
                    await this.setTableColumnsData("VPOCOND");
                    
                }
            },
            onKeyDownCond: async function(){
                var me = this;
                var condrec = this.getView().getModel("ui").getProperty("/activeCondRec");
                
                if (this._condPOItemCount ===  this._condPOItemMatNoStore.length -1) {
                    this._condPOItemCount--;
                }

                if(this._condPOItemCount != this._condPOItemMatNoStore.length - 1){
                    this._condPOItemCount++;
                    var poItem = this._condPOItemMatNoStore[this._condPOItemCount].poItem;
                    var matNo = this._condPOItemMatNoStore[this._condPOItemCount].matNo;
                    var shortText = this._condPOItemMatNoStore[this._condPOItemCount].shortText;

                    this.getView().getModel("ui").setProperty("/activePOItem", poItem);
                    this.getView().getModel("ui").setProperty("/condMatNo", matNo);
                    this.getView().getModel("ui").setProperty("/condShortText", shortText);
                    await this.getConditions2(condrec, poItem)
                    await this.setTableColumnsData("VPOCOND");
                    
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
                    var iActiveRowIndex = this.getView().getModel("VPOHdr").getData().results.findIndex(item => item.ACTIVE === "X");

                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext("VPOHdr") && +row.getBindingContext("VPOHdr").sPath.replace("/results/", "") === iActiveRowIndex) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow");
                    })
                }, 1);
            },
            onFirstVisibleRowChanged: function (oEvent) {
                return
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
            onCellClick: async function(oEvent) {
                var sRowPath = oEvent.getParameters().rowBindingContext.sPath;
                sRowPath = "/results/"+ sRowPath.split("/")[2];
                var oRow;
                var oTable;
                var PONo = this.getView().getModel("ui").getProperty("/activePONo")
                var condrec = this.getView().getModel("ui").getProperty("/activeCondRec")
                var me = this;
                
                if(oEvent.getParameters().id.includes("mainTab")){
                    oRow = this.getView().getModel("VPOHdr").getProperty(sRowPath)
                    oTable = this.byId("mainTab");
                    this.getView().getModel("ui").setProperty("/activePONo", oRow.PONO);
                    this.getView().getModel("ui").setProperty("/activeCondRec", oRow.CONDREC);
                    this.getView().getModel("ui").setProperty("/activeDocTyp", oRow.DOCTYPE)

                    PONo = this.getView().getModel("ui").getProperty("/activePONo");
                    condrec = this.getView().getModel("ui").getProperty("/activeCondRec");
                    _promiseResult = new Promise(async(resolve,reject)=> {
                        
                        me._tblChange = true;
                        await me.getPODetails2(PONo)
                        await me.getDelSchedule2(PONo)
                        await me.getDelInvoice2(PONo)
                        var poItem = me.getView().getModel("ui").getProperty("/activePOItem");
                        await me.getPOHistory2(PONo, poItem)
                        await me.getConditions2(condrec, poItem)
                        resolve();
                    })
                    await _promiseResult;

                    this.getProcessFlow();
    
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
                    this._tblChange = false;
                }else if(oEvent.getParameters().id.includes("detailsTab")){
                    oRow = this.getView().getModel("VPODtls").getProperty(sRowPath)
                    oTable = this.byId("detailsTab");
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
                }else if(oEvent.getParameters().id.includes("delSchedTab")){
                    oRow = this.getView().getModel("VPODelSched").getProperty(sRowPath)
                    oTable = this.byId("delSchedTab");
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
                }else if(oEvent.getParameters().id.includes("delInvTab")){
                    oRow = this.getView().getModel("VPODelInv").getProperty(sRowPath)
                    oTable = this.byId("delInvTab");
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
                }else if(oEvent.getParameters().id.includes("poHistTab")){
                    oRow = this.getView().getModel("VPOPOHist").getProperty(sRowPath)
                    oTable = this.byId("poHistTab");
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
                }else if(oEvent.getParameters().id.includes("conditionsTab")){
                    oRow = this.getView().getModel("VPOCond").getProperty(sRowPath)
                    oTable = this.byId("conditionsTab");
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

            onExportToExcel: Utils.onExport,

            onTableResize: function(oEvent){
                var event = oEvent.getSource();
                var oSplitter = this.byId("splitMain");
                var oFirstPane = oSplitter.getRootPaneContainer().getPanes().at(0);
                var oSecondPane = oSplitter.getRootPaneContainer().getPanes().at(1);
                if(this._tableFullScreenRender === ""){
                    //hide Smart Filter Bar
                    this.byId('smartFilterBar').setVisible(false)
                    
                    if(event.getParent().getParent().getId().includes("mainTab")){
                        this.byId('itbDetail').setVisible(false)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "100%",
                            resizable: false
                        });
                        oFirstPane.setLayoutData(oLayoutData);
                        
                        this.byId('btnFullScreen').setVisible(false)
                        this.byId('btnExitFullScreen').setVisible(true)
                        this.byId("_IDGenVBox1").addStyleClass("onAddvboxHeight")
                    }
                    else if(event.getParent().getParent().getId().includes("detailsTab")){
                        this.byId('mainTab').setVisible(false)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "100%",
                            resizable: false
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").addStyleClass("onAddvboxHeight")
                        this.byId("itbDetail").removeStyleClass("designSection2")
                        this.byId("itbDetail").addStyleClass("addDesignSection2")

                        this.byId('btnFullScreenDetails').setVisible(false)
                        this.byId('btnExitFullScreenDetails').setVisible(true)

                        // this.byId("detailsIconTab").setEnabled(false);
                        this.byId("delSchedIconTab").setEnabled(false);
                        this.byId("delInvIconTab").setEnabled(false);
                        this.byId("poHistIconTab").setEnabled(false);
                        this.byId("conditionsIconTab").setEnabled(false);
                        this.byId("procFlowIconTab").setEnabled(false);
                    }
                    else if(event.getParent().getParent().getId().includes("delSchedTab")){
                        this.byId('mainTab').setVisible(false)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "100%",
                            resizable: false
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").addStyleClass("onAddvboxHeight")
                        this.byId("itbDetail").removeStyleClass("designSection2")
                        this.byId("itbDetail").addStyleClass("addDesignSection2")

                        this.byId('btnFullScreenDelSched').setVisible(false)
                        this.byId('btnExitFullScreenDelSched').setVisible(true)

                        this.byId("detailsIconTab").setEnabled(false);
                        // this.byId("delSchedIconTab").setEnabled(false);
                        this.byId("delInvIconTab").setEnabled(false);
                        this.byId("poHistIconTab").setEnabled(false);
                        this.byId("conditionsIconTab").setEnabled(false);
                        this.byId("procFlowIconTab").setEnabled(false);
                    }
                    else if(event.getParent().getParent().getId().includes("delInvTab")){
                        this.byId('mainTab').setVisible(false)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "100%",
                            resizable: false
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").addStyleClass("onAddvboxHeight")
                        this.byId("itbDetail").removeStyleClass("designSection2")
                        this.byId("itbDetail").addStyleClass("addDesignSection2")

                        this.byId('btnFullScreenDelInv').setVisible(false)
                        this.byId('btnExitFullScreenDelInv').setVisible(true)

                        this.byId("detailsIconTab").setEnabled(false);
                        this.byId("delSchedIconTab").setEnabled(false);
                        // this.byId("delInvIconTab").setEnabled(false);
                        this.byId("poHistIconTab").setEnabled(false);
                        this.byId("conditionsIconTab").setEnabled(false);
                        this.byId("procFlowIconTab").setEnabled(false);
                    }
                    else if(event.getParent().getParent().getId().includes("poHistTab")){
                        this.byId('mainTab').setVisible(false)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "100%",
                            resizable: false
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").addStyleClass("onAddvboxHeight")
                        this.byId("itbDetail").removeStyleClass("designSection2")
                        this.byId("itbDetail").addStyleClass("addDesignSection2")

                        this.byId('btnFullScreenPOHistory').setVisible(false)
                        this.byId('btnExitFullScreenPOHistory').setVisible(true)

                        this.byId("detailsIconTab").setEnabled(false);
                        this.byId("delSchedIconTab").setEnabled(false);
                        this.byId("delInvIconTab").setEnabled(false);
                        // this.byId("poHistIconTab").setEnabled(false);
                        this.byId("conditionsIconTab").setEnabled(false);
                        this.byId("procFlowIconTab").setEnabled(false);
                    }
                    else if(event.getParent().getParent().getId().includes("conditionsTab")){
                        this.byId('mainTab').setVisible(false)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "100%",
                            resizable: false
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").addStyleClass("onAddvboxHeight")
                        this.byId("itbDetail").removeStyleClass("designSection2")
                        this.byId("itbDetail").addStyleClass("addDesignSection2")

                        this.byId('btnFullScreenConditions').setVisible(false)
                        this.byId('btnExitFullScreenConditions').setVisible(true)

                        this.byId("detailsIconTab").setEnabled(false);
                        this.byId("delSchedIconTab").setEnabled(false);
                        this.byId("delInvIconTab").setEnabled(false);
                        this.byId("poHistIconTab").setEnabled(false);
                        // this.byId("conditionsIconTab").setEnabled(false);
                        this.byId("procFlowIconTab").setEnabled(false);
                    }
                    else if(event.getParent().getParent().getId().includes("procFlowIconTab")){
                        this.byId('mainTab').setVisible(false)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "100%",
                            resizable: false
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").addStyleClass("onAddvboxHeight")
                        this.byId("itbDetail").removeStyleClass("designSection2")
                        this.byId("itbDetail").addStyleClass("addDesignSection2")

                        this.byId("detailsIconTab").setEnabled(false);
                        this.byId("delSchedIconTab").setEnabled(false);
                        this.byId("delInvIconTab").setEnabled(false);
                        this.byId("poHistIconTab").setEnabled(false);
                        this.byId("conditionsIconTab").setEnabled(false);
                    }
                    this._tableFullScreenRender = "Value"
                }
            },
            
            onExitTableResize: function (oEvent){
                var event = oEvent.getSource();
                var oSplitter = this.byId("splitMain");
                var oFirstPane = oSplitter.getRootPaneContainer().getPanes().at(0);
                var oSecondPane = oSplitter.getRootPaneContainer().getPanes().at(1);
                if(this._tableFullScreenRender !== ""){
                    //hide Smart Filter Bar
                    this.byId('smartFilterBar').setVisible(true)

                    if(event.getParent().getParent().getId().includes("mainTab")){
                        this.byId('itbDetail').setVisible(true)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "46%",
                            resizable: true
                        });
                        oFirstPane.setLayoutData(oLayoutData);

                        this.byId('btnFullScreen').setVisible(true)
                        this.byId('btnExitFullScreen').setVisible(false)
                        this.byId("_IDGenVBox1").removeStyleClass("onAddvboxHeight")
                    }
                    else if(event.getParent().getParent().getId().includes("detailsTab")){
                        this.byId('mainTab').setVisible(true)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "54%",
                            resizable: true
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").removeStyleClass("onAddvboxHeight")
                        this.byId("itbDetail").addStyleClass("designSection2")
                        this.byId("itbDetail").removeStyleClass("addDesignSection2")

                        this.byId('btnFullScreenDetails').setVisible(true)
                        this.byId('btnExitFullScreenDetails').setVisible(false)

                        // this.byId("detailsIconTab").setEnabled(true);
                        this.byId("delSchedIconTab").setEnabled(true);
                        this.byId("delInvIconTab").setEnabled(true);
                        this.byId("poHistIconTab").setEnabled(true);
                        this.byId("conditionsIconTab").setEnabled(true);
                        this.byId("procFlowIconTab").setEnabled(true);
                    }
                    else if(event.getParent().getParent().getId().includes("delSchedTab")){
                        this.byId('mainTab').setVisible(true)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "54%",
                            resizable: true
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").removeStyleClass("onAddvboxHeight")
                        this.byId("itbDetail").addStyleClass("designSection2")
                        this.byId("itbDetail").removeStyleClass("addDesignSection2")

                        this.byId('btnFullScreenDelSched').setVisible(true)
                        this.byId('btnExitFullScreenDelSched').setVisible(false)

                        this.byId("detailsIconTab").setEnabled(true);
                        // this.byId("delSchedIconTab").setEnabled(true);
                        this.byId("delInvIconTab").setEnabled(true);
                        this.byId("poHistIconTab").setEnabled(true);
                        this.byId("conditionsIconTab").setEnabled(true);
                        this.byId("procFlowIconTab").setEnabled(true);
                    }
                    else if(event.getParent().getParent().getId().includes("delInvTab")){
                        this.byId('mainTab').setVisible(true)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "54%",
                            resizable: true
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").removeStyleClass("onAddvboxHeight")
                        this.byId("itbDetail").addStyleClass("designSection2")
                        this.byId("itbDetail").removeStyleClass("addDesignSection2")

                        this.byId('btnFullScreenDelInv').setVisible(true)
                        this.byId('btnExitFullScreenDelInv').setVisible(false)

                        this.byId("detailsIconTab").setEnabled(true);
                        this.byId("delSchedIconTab").setEnabled(true);
                        // this.byId("delInvIconTab").setEnabled(true);
                        this.byId("poHistIconTab").setEnabled(true);
                        this.byId("conditionsIconTab").setEnabled(true);
                        this.byId("procFlowIconTab").setEnabled(true);
                    }
                    else if(event.getParent().getParent().getId().includes("poHistTab")){
                        this.byId('mainTab').setVisible(true)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "54%",
                            resizable: true
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").removeStyleClass("onAddvboxHeight")
                        this.byId("itbDetail").addStyleClass("designSection2")
                        this.byId("itbDetail").removeStyleClass("addDesignSection2")

                        this.byId('btnFullScreenPOHistory').setVisible(true)
                        this.byId('btnExitFullScreenPOHistory').setVisible(false)

                        this.byId("detailsIconTab").setEnabled(true);
                        this.byId("delSchedIconTab").setEnabled(true);
                        this.byId("delInvIconTab").setEnabled(true);
                        // this.byId("poHistIconTab").setEnabled(true);
                        this.byId("conditionsIconTab").setEnabled(true);
                        this.byId("procFlowIconTab").setEnabled(true);
                    }
                    else if(event.getParent().getParent().getId().includes("conditionsTab")){
                        this.byId('mainTab').setVisible(true)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "54%",
                            resizable: true
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").removeStyleClass("onAddvboxHeight")
                        this.byId("itbDetail").addStyleClass("designSection2")
                        this.byId("itbDetail").removeStyleClass("addDesignSection2")

                        this.byId('btnFullScreenConditions').setVisible(true)
                        this.byId('btnExitFullScreenConditions').setVisible(false)

                        this.byId("detailsIconTab").setEnabled(true);
                        this.byId("delSchedIconTab").setEnabled(true);
                        this.byId("delInvIconTab").setEnabled(true);
                        this.byId("poHistIconTab").setEnabled(true);
                        // this.byId("conditionsIconTab").setEnabled(true);
                        this.byId("procFlowIconTab").setEnabled(true);
                    }
                    else if(event.getParent().getParent().getId().includes("procFlowIconTab")){
                        this.byId('mainTab').setVisible(true)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "54%",
                            resizable: true
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").removeStyleClass("onAddvboxHeight")
                        this.byId("itbDetail").addStyleClass("designSection2")
                        this.byId("itbDetail").removeStyleClass("addDesignSection2")

                        this.byId("detailsIconTab").setEnabled(true);
                        this.byId("delSchedIconTab").setEnabled(true);
                        this.byId("delInvIconTab").setEnabled(true);
                        this.byId("poHistIconTab").setEnabled(true);
                        this.byId("conditionsIconTab").setEnabled(true);
                    }
                    this._tableFullScreenRender = ""
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
            },

            onNavToAnP: function(){
                var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
                oCrossAppNavigator.toExternal({
                    target: {
                        semanticObject: "ZSO_3DERP_APROCESS",
                        action: "display"
                    }
                });
            },
            callCaptionsAPI: function(){
                var me = this;
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

                oDDTextParam.push({CODE: "DETAILS"});
                oDDTextParam.push({CODE: "DELSCHED"});
                oDDTextParam.push({CODE: "DELIVERY"});
                oDDTextParam.push({CODE: "INVOICE"});
                oDDTextParam.push({CODE: "POHIST"});

                oDDTextParam.push({CODE: "PONO"});
                oDDTextParam.push({CODE: "POITEM"});
                oDDTextParam.push({CODE: "CONDREC"});
                oDDTextParam.push({CODE: "SAVELAYOUT"});

                oDDTextParam.push({CODE: "LOADING"});


                oDDTextParam.push({CODE: "HEADER"});
                oDDTextParam.push({CODE: "RELSTRAT"});
                oDDTextParam.push({CODE: "CONDITIONS"});
                oDDTextParam.push({CODE: "HEADERTEXT"});
                oDDTextParam.push({CODE: "CHANGES"});

                oDDTextParam.push({CODE: "POACTION"});
                oDDTextParam.push({CODE: "CHANGEDELVDATE"});
                oDDTextParam.push({CODE: "CHANGEVENDOR"});
                oDDTextParam.push({CODE: "DELETEPO"});
                oDDTextParam.push({CODE: "CANCELPO"});
                oDDTextParam.push({CODE: "SPLITPO"});

                oDDTextParam.push({CODE: "PODATE"});
                oDDTextParam.push({CODE: "VENDOR"});
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

                oDDTextParam.push({CODE: "ADDPRTOPO"});
                oDDTextParam.push({CODE: "ITEMCHANGES"});
                oDDTextParam.push({CODE: "LINESPLIT"});

                oDDTextParam.push({CODE: "PROCFLOW"});

                oDDTextParam.push({CODE: "UNRELEASEDPO"});
                oDDTextParam.push({CODE: "OPENLINEITEMS"});
                oDDTextParam.push({CODE: "MANUAL"});
                oDDTextParam.push({CODE: "ASSIGNPROCESS"});
                oDDTextParam.push({CODE: "INFO_ERROR"});
                oDDTextParam.push({CODE: "INFO_NO_LAYOUT"});
                oDDTextParam.push({CODE: "SAVELAYOUT"});
                oDDTextParam.push({CODE: "FULLSCREEN"});
                oDDTextParam.push({CODE: "EXITFULLSCREEN"});
                oDDTextParam.push({CODE: "EXPORTTOEXCEL"});
                oDDTextParam.push({CODE: "CREATEDBY"});

                oDDTextParam.push({CODE: "MATNO"});
                oDDTextParam.push({CODE: "SHORTTEXT"});

                oDDTextParam.push({CODE: "ARROWUP"});
                oDDTextParam.push({CODE: "ARROWDOWN"});
                oDDTextParam.push({CODE: "POPRINT"});
                oDDTextParam.push({CODE: "PRNO"});
                oDDTextParam.push({CODE: "IONO"});

                oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                    method: "POST",
                    success: function(oData, oResponse) {
                        oData.CaptionMsgItems.results.forEach(item=>{
                            oDDTextResult[item.CODE] = item.TEXT;
                        })
                        
                        oJSONModel.setData(oDDTextResult);
                        me.getView().setModel(oJSONModel, "captionMsg");
                    },
                    error: function(err) {
                        //error message
                        console.log(err);
                        MessageBox.error(me.getView().getModel("captionMsg").getData()["INFO_ERROR"])
                    }
                });
            },
            
            getProcessFlow: function() {
                // this.getView().getModel("processFlow").setProperty("/nodes", []);

                var oModel = this.getOwnerComponent().getModel();
                var me = this;
                var oGRData = [], oInvData = [];

                var bGetGRFin = false, bGetInvFin = false;
                var vPONO = this.getView().getModel("ui").getProperty("/activePONo");

                oModel.read('/VPOProcFlowGRSet', { 
                    urlParameters: {
                        "$filter": "EBELN eq '" + vPONO + "'"
                    },
                    success: function (oData, oResponse) {
                        oGRData = oData.results;
                        bGetGRFin = true;
                    },
                    error: function (err) { bGetGRFin = true; }
                });

                oModel.read('/VPOProcFlowINVSet', { 
                    urlParameters: {
                        "$filter": "EBELN eq '" + vPONO + "'"
                    },
                    success: function (oData, oResponse) {
                        oInvData = oData.results;
                        bGetInvFin = true;
                    },
                    error: function (err) { bGetInvFin = true; }
                });

                var oInterval = setInterval(() => {
                    if (bGetGRFin && bGetInvFin) {
                        me.setProcessFlow(oGRData, oInvData);
                        clearInterval(oInterval);
                    }
                }, 100);
            },

            setProcessFlow: function(oGRData, oInvData) {
                this._processFlowData = [];

                var oNodes = [];
                var iCounter = 0;
                var sVendor = "";
                var vPONO = this.getView().getModel("ui").getProperty("/activePONo");

                this.byId("mainTab").getModel().getData().rows.filter(fItem => fItem.PONO === vPONO).map(val => sVendor = val.VENDOR);
                if(this.byId("detailsTab").getModel().getData().rows !== undefined){
                    this.byId("detailsTab").getModel().getData().rows.forEach(item => {  
                        iCounter++;

                        var oChildren = [];
                        var oGRItemData = oGRData.filter(fItem => fItem.EBELP === item.ITEM);
                        var oInvItemData = oInvData.filter(fItem => fItem.EBELP === item.ITEM);

                        oGRItemData.forEach((gr, idx) => oChildren.push(idx+1+iCounter));
                        oInvItemData.forEach((inv, idx) => oChildren.push(idx+1+iCounter+oGRItemData.length));

                        oNodes.push({
                            id: iCounter + "",
                            lane: "0",
                            title: "Purchase Order " + item.PONO + "/" + item.ITEM,
                            titleAbbreviation: "PO",
                            children: oChildren,
                            state: "Positive",
                            stateText: "Follow-On Documents",
                            focused: true,
                            highlighted: false,
                            texts: [ "Created On: " + dateFormat.format(new Date(item.CREATEDDT)), "Vendor: " + sVendor ]                        
                        })
                        
                        oGRItemData.forEach(gr => {
                            iCounter++;

                            var oState = "";
                            var vBaseQty = 0;

                            if (+gr.MENGE === 0) { oState = "Negative" }
                            else if (+gr.MENGE > 0 && +gr.MENGE !== +item.POQTY) { oState = "Critical" }
                            else if (+gr.MENGE === +item.POQTY) { oState = "Positive" }

                            if (gr.BASEANDEC === 0) { vBaseQty = (+gr.MENGE).toFixed(gr.BASEANDEC) }

                            oNodes.push({
                                id: iCounter + "",
                                lane: "1",
                                title: "Goods Receipt " + gr.MBLNR + "/" + gr.ZEILE,
                                titleAbbreviation: "GR",
                                children: [ ],
                                state: "Positive",
                                stateText: "Completed",
                                focused: true,
                                highlighted: false,
                                texts: [ "Posted On: " + dateFormat.format(new Date(gr.BUDAT)), 
                                    "Quantity (Base): " + vBaseQty + " " + gr.MEINS,
                                    "Quantity (Order): " + gr.ERFMG + " " + gr.ERFME],                            
                            })

                            // processFlowGRData.push({
                            //     NODEID: iCounter + "",
                            //     DOCTYPE: "MD",
                            //     EBELN: gr.EBELN,
                            //     EBELP: gr.EBELP,
                            //     MBLNR: gr.MBLNR,
                            //     MJAHR: gr.MJAHR,
                            //     ZEILE: gr.ZEILE
                            // })

                            this._processFlowData.push({
                                NODEID: iCounter + "",
                                ITEM: {
                                    NODEID: iCounter + "",
                                    DOCTYPE: "MAT",
                                    EBELN: gr.EBELN,
                                    EBELP: gr.EBELP,
                                    MBLNR: gr.MBLNR,
                                    MJAHR: gr.MJAHR,
                                    ZEILE: gr.ZEILE
                                }
                            })
                        })
                        
                        oInvItemData.forEach(inv => {
                            iCounter++;
                            oNodes.push({
                                id: iCounter + "",
                                lane: "2",
                                title: "Supplier Invoice " + inv.BELNR + "/" + inv.BUZEI,
                                titleAbbreviation: "INV",
                                children: [ ],
                                state: "Positive",
                                stateText: inv.BUDAT !== null ? "Posted" : "Not Yet Posted",
                                focused: true,
                                highlighted: false,
                                texts: [ "Posted On: " + dateFormat.format(new Date(inv.BUDAT)), 
                                    "Gross Amount: " + inv.RMWWR + " " + inv.WAERS]
                            })

                            // processFlowInvData.push({
                            //     NODEID: iCounter + "",
                            //     LANE: "2",
                            //     BELNR : inv.BELNR ,
                            //     GJAHR: inv.GJAHR
                            // })

                            this._processFlowData.push({
                                NODEID: iCounter + "",
                                ITEM: {
                                    NODEID: iCounter + "",
                                    DOCTYPE: "INV",
                                    BELNR : inv.BELNR ,
                                    GJAHR: inv.GJAHR
                                }
                            })
                        })
                    })
                }
                
                this.getView().getModel("processFlow").setProperty("/nodes", oNodes);
                // this.getView().setModel(new JSONModel(nodeLanes), "processFlow");
                // this.byId("processFlowPO").setZoomLevel(sap.suite.ui.commons.ProcessFlowZoomLevel.One)
                this.byId("processFlowPO").setZoomLevel("One")
            },

            onNodePress: function(oEvent) {
                var oData = this._processFlowData.filter(fItem => fItem.NODEID === oEvent.getParameters().getNodeId());
                this.viewDoc(oData[0].ITEM); 
            },

            viewDoc: function(oData) {
                var vSBU = this.getView().getModel("ui").getData().sbu;
                var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

                if (oData.DOCTYPE === "MAT") {
                    // var vMatDoc = oData[0].MBLNR;
                    // var vMatDocYear = oData[0].MJAHR;
    
                    var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
                        target: {
                            semanticObject: "ZSO_3DERP_INV_MIGO_DIALOG",
                            action: "display"
                        },
                        params: {
                            "MatDoc": oData.MBLNR,
                            "MatDocYear": oData.MJAHR,
                            "MatDocItem": oData.ZEILE,
                            "PONumber": oData.EBELN,
                            "POItem": oData.EBELP
                        }
                    })) || ""; // generate the Hash to display style
                }
                else if (oData.DOCTYPE === "INV") {
                    var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
                        target: {
                            semanticObject: "SupplierInvoice",
                            action: "displayAdvanced"
                        },
                        params: {
                            "RBKP-BELNR": oData.BELNR,
                            "RBKP-GJAHR": oData.GJAHR
                        }
                    })) || ""; // generate the Hash to display style 
                }
                else if (oData.DOCTYPE === "PR") {
                    var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
                        target: {
                            semanticObject: "ZSO_3DERP_PUR_PR",
                            action: "display&/PRDetail/" + vSBU + "/" + oData.PRNO + "/" + oData.PRITEM
                        }
                    })) || ""; 
                }

                oCrossAppNavigator.toExternal({
                    target: {
                        shellHash: hash
                    }
                });
            },

            onPOLock: async function(){
                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_LOCK2_SRV");
                var sError = "";
                var boolResult = true;

                var oParam = {
                    "N_LOCK_PO_ITEMTAB": this._aParamLockPOdata,
                    "iv_count": 300, 
                    "N_LOCK_PO_ENQ": [], 
                    "N_LOCK_PO_OUTMESSAGES": [] 
                }
                console.log(oParam);
                await new Promise((resolve, reject) => {
                    oModel.create("/Lock_POHdr_Set", oParam, {
                        method: "POST",
                        success: function(data, oResponse) {
                            console.log(data)
                            for(var item of data.N_LOCK_PO_OUTMESSAGES.results) {
                                if (item.Type === "E") {
                                    sError += item.Message + ". ";
                                }
                            }

                            if (sError.length > 0) {
                                boolResult = false;
                                MessageBox.information(sError);
                                me.closeLoadingDialog();
                            }
                            resolve();
                        },
                        error: function(err) {
                            MessageBox.error(err);
                            resolve();
                            me.closeLoadingDialog();
                        }
                    });
                    
                });
                return boolResult;
            },

            onPOUnlock: async function(){
                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_LOCK2_SRV");

                var oParam = {
                    "N_UNLOCK_PO_ITEMTAB": this._aParamLockPOdata,
                    "N_UNLOCK_PO_ENQ": [], 
                    "N_UNLOCK_PO_MESSAGES": [] 
                };

                await new Promise((resolve, reject) => {
                    oModel.create("/Unlock_POHdr_Set", oParam, {
                        method: "POST",
                        success: function(data, oResponse) {
                            resolve();
                        },
                        error: function(err) {
                            MessageBox.error(err);
                            resolve();
                            me.closeLoadingDialog();
                        }
                    });
                });
            }

        });
    });
