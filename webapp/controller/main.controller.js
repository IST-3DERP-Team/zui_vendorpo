sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, Filter, FilterOperator, MessageBox) {
        "use strict";

        var that;
        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
        var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });
        var _promiseResult;

        return Controller.extend("zuivendorpo.controller.main", {
            onInit: function () {
                that = this;
                this._oModel = this.getOwnerComponent().getModel();
                this.callCaptionsAPI();
                this._counts = {
                    unreleasedpo: 0,
                    openlineitems: 0,
                }
                this.getView().setModel(new JSONModel({
                    sbu: '',
                    activePONo:'',
                    activePOItem:'',
                    activeCondRec:'',
                }), "ui");

                var oDelegateKeyUp = {
                    onkeyup: function(oEvent){
                        that.onKeyUp(oEvent);
                    }
                };
                
                this.byId("mainTab").addEventDelegate(oDelegateKeyUp);
                this.byId("detailsTab").addEventDelegate(oDelegateKeyUp);
                this.byId("delSchedTab").addEventDelegate(oDelegateKeyUp);
                this.byId("delInvTab").addEventDelegate(oDelegateKeyUp);
                this.byId("poHistTab").addEventDelegate(oDelegateKeyUp);
                this.byId("conditionsTab").addEventDelegate(oDelegateKeyUp);

                this._sbuChange = false;
                this._tblChange = false;
                var oJSONDataModel = new JSONModel(); 
                oJSONDataModel.setData(this._counts);
                this.getView().setModel(oJSONDataModel, "counts");
                
                this.setSmartFilterModel();

                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_VPO_FILTERS_CDS");
                oModel.read("/ZVB_3DERP_SBU_SH", {
                    success: function (oData, oResponse) {
                        // console.log(oData)
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
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                this.getView().setModel(new JSONModel({dataMode: 'NODATA',}), "ui");


                this.updUnlock = 1;
                this.zpoUnlock = 1
                this.ediVendor; 

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
                this.showLoadingDialog(this.getView().getModel("captionMsg").getData()["LOADING"]);
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(this.getMain());
                });
                await _promiseResult;
                
                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.getCols());
                });
                await _promiseResult;
                this.closeLoadingDialog();

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

                        
                        var PONo = this.getView().getModel("ui").getProperty("/activePONo");

                        _promiseResult = new Promise((resolve,reject)=> {
                        
                            this._tblChange = true;
                            this.getPODetails2(PONo)
                            this.getDelSchedule2(PONo)
                            this.getDelInvoice2(PONo)
                            this.getPOHistory2(PONo)
                            this.getConditions2(PONo)
                            resolve();
                        })
                        await _promiseResult;;
                        this.closeLoadingDialog(that);
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
                        this.closeLoadingDialog(that);
                    }
                }
    
            },
            getMain: async function(){
                var oModel = this.getOwnerComponent().getModel();
                var me = this;
                var poNo;
                var poItem;
                var condrec;
                var aFilters = this.getView().byId("smartFilterBar").getFilters();

                var vSBU = this.getView().getModel("ui").getData().sbu;

                
                if (aFilters.length > 0) {
                    aFilters[0].aFilters.forEach(item => {
                        if (item.sPath === 'VENDOR') {
                            if (!isNaN(item.oValue1)) {
                                while (item.oValue1.length < 10) item.oValue1 = "0" + item.oValue1;
                            }
                        }
                    })
                }

                return new Promise((resolve, reject) => {
                    oModel.read('/mainSet', {
                        filters: aFilters,
                        success: function (data, response) {
                            if (data.results.length > 0) {

                                data.results.sort(function(a,b) {
                                    return new Date(b.PODT) - new Date(a.PODT);
                                });

                                data.results.forEach(item => {
                                    item.PODT = dateFormat.format(item.PODT);
                                })
                                
                                /*data.results.sort((a,b) => (a.GMC > b.GMC ? 1 : -1));*/
                                poNo = data.results[0].PONO;
                                condrec = data.results[0].CONDREC;
                                var oJSONModel = new sap.ui.model.json.JSONModel();
                                oJSONModel.setData(data);
                                me.getView().setModel(oJSONModel, "VPOHdr");
                                me.getView().getModel("ui").setProperty("/activePONo", poNo);
                                me.getView().getModel("ui").setProperty("/activeCondRec", condrec);
                                resolve(me.getPODetails2(poNo));
                                resolve(me.getDelSchedule2(poNo));
                                resolve(me.getDelInvoice2(poNo));
                                resolve(me.getPOHistory2(poNo));
                                resolve(me.getConditions2(poNo));
                                resolve();
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
                        error: function (err) { }
                    });
                    
                    
                });
            },
            getPOHistory2: async function(PONO){
                var oModel = this.getOwnerComponent().getModel();
                var me = this;
                var tblChange = this._tblChange;
                var oJSONModel = new sap.ui.model.json.JSONModel();
                var objectData = [];
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
            getConditions2: async function(CONDREC){
                var oModel = this.getOwnerComponent().getModel();
                var me = this;
                var tblChange = this._tblChange;
                var oJSONModel = new sap.ui.model.json.JSONModel();
                return new Promise((resolve, reject)=>{
                    oModel.read('/VPOConditionsSet', { 
                        urlParameters: {
                            "$filter": "KNUMV eq '" + CONDREC + "'"
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
                var tblChange = this._tblChange;
                var oJSONModel = new sap.ui.model.json.JSONModel();
                var objectData = [];
                return new Promise((resolve, reject)=>{
                    oModel.read('/VPODetailsSet', { 
                        urlParameters: {
                            "$filter": "PONO eq '" + PONO + "'"
                        },
                        success: function (data, response) {
                            if (data.results.length > 0) {
                                data.results.forEach(item => {
                                    item.DELDT = dateFormat.format(new Date(item.DELDT));
                                })
                                objectData.push(data.results);
                                objectData[0].sort((a,b) => (a.ITEM > b.ITEM) ? 1 : ((b.ITEM > a.ITEM) ? -1 : 0));
                                
                                oJSONModel.setData(data);
                            }

                            
                            var poItem = data.results[0].ITEM;
                            me.getView().getModel("ui").setProperty("/activePOItem", poItem);

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
                            }
                        },
                        error: function (err) {
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

                    //double click event
                    this.byId("mainTab").attachBrowserEvent('dblclick',function(e){
                        var PONo = me.getView().getModel("ui").getProperty("/activePONo");
                        var CONDREC = me.getView().getModel("ui").getProperty("/activeCondRec");
                        var SBU = me.getView().getModel("ui").getData().sbu;
                        e.preventDefault();
                        if(me.getView().getModel("ui").getData().dataMode === 'READ'){
                            me.navToDetail(PONo, CONDREC, SBU); //navigate to detail page
                        }
                    });
                }
                if (modCode === 'VPODTLS') {
                    oColumnsModel = this.getView().getModel("VPODtls");  
                    oDataModel = this.getView().getModel("VPODTLSColumns"); 
                    
                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');

                    if(this._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');   
                    this.addColumns("detailsTab", oColumnsData, oData, "VPODtls");
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
                if (sColumnId === "UNLIMITED" || sColumnId === "OVERDELTOL" || sColumnId === "UNDERDELTOL") { 
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
                this.updUnlock = 0;
                this.navToDetail(PONo, CONDREC, SBU);
                
            },
            navToDetail(PONo, CONDREC, SBU){
                var me = this;

                var oJSONModel = new JSONModel();
                oJSONModel.setData(this.getView().getModel("captionMsg").getData());
                this._router.navTo("vendorpodetail", {
                    PONO: PONo,
                    CONDREC: CONDREC,
                    SBU: SBU
                });
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
                        sap.m.MessageBox.information("Layout saved.");
                        //Common.showMessage(me._i18n.getText('t6'));
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(err);
                    }
                });                
            },
            onSelectionChange: async function(oEvent){
                var sRowPath = oEvent.getParameter("rowContext");
                sRowPath = "/results/"+ sRowPath.getPath().split("/")[2];

                var oRow;
                var oTable;
                var PONo = this.getView().getModel("ui").getProperty("/activePONo")
                var me = this;
                if(oEvent.getParameters().id.includes("mainTab")){
                    oRow = this.getView().getModel("VPOHdr").getProperty(sRowPath)
                    oTable = this.byId("mainTab");
                    this.getView().getModel("ui").setProperty("/activePONo", oRow.PONO);
                    this.getView().getModel("ui").setProperty("/activeCondRec", oRow.CONDREC);

                    PONo = this.getView().getModel("ui").getProperty("/activePONo");
                    _promiseResult = new Promise((resolve,reject)=> {
                        
                        me._tblChange = true;
                        me.getPODetails2(PONo)
                        me.getDelSchedule2(PONo)
                        me.getDelInvoice2(PONo)
                        me.getPOHistory2(PONo)
                        me.getConditions2(PONo)
                        resolve();
                    })
                    await _promiseResult;;
    
                    _promiseResult = new Promise((resolve, reject)=>{
                        oTable.getRows().forEach(row => {
                            if(row.getBindingContext().sPath.replace("/rows/", "") === sRowPath.split("/")[2]){
                                resolve(row.addStyleClass("activeRow"));
                                oTable.setSelectedIndex(parseInt(sRowPath.split("/")[2]));
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

                        _promiseResult = new Promise((resolve,reject)=> {
                            
                            me._tblChange = true;
                            resolve(me.getPODetails2(oRow.PONO));
                            resolve(me.getDelSchedule2(oRow.PONO));
                            resolve(me.getDelInvoice2(oRow.PONO));
                            resolve(me.getPOHistory2(oRow.PONO));
                            resolve(me.getConditions2(oRow.CONDREC));
                            oTable.getRows().forEach(row => {
                                if(row.getBindingContext().sPath.replace("/rows/", "") === index[2]){
                                    resolve(row.addStyleClass("activeRow"));
                                }else{
                                    resolve(row.removeStyleClass("activeRow"));
                                }
                            });
                        })
                        await _promiseResult;
                        
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
                var me = this;
                
                if(oEvent.getParameters().id.includes("mainTab")){
                    oRow = this.getView().getModel("VPOHdr").getProperty(sRowPath)
                    oTable = this.byId("mainTab");
                    this.getView().getModel("ui").setProperty("/activePONo", oRow.PONO);
                    this.getView().getModel("ui").setProperty("/activeCondRec", oRow.CONDREC);

                    PONo = this.getView().getModel("ui").getProperty("/activePONo");
                    _promiseResult = new Promise((resolve,reject)=> {
                        
                        me._tblChange = true;
                        me.getPODetails2(PONo)
                        me.getDelSchedule2(PONo)
                        me.getDelInvoice2(PONo)
                        me.getPOHistory2(PONo)
                        me.getConditions2(PONo)
                        resolve();
                    })
                    await _promiseResult;;
    
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

            onCreateManualPO() {
                if (this.getView().getModel("ui").getData().sbu) {
                    var sSbu = this.getView().getModel("ui").getData().sbu;
                    console.log("onCreateManualPO", sSbu)
                    that._router.navTo("RouteCreateManualPO", {
                        sbu: sSbu
                    }, true);
                } else {
                    sap.m.MessageBox.information("SBU is required.");
                }
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
            
        });
    });
