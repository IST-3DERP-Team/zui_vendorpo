sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/core/routing/History"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, Common, MessageBox, History) {
        "use strict";

        var _this;
        var _sbu;
        var _oCaption = {};
        var _startUpInfo;
        var _oHeader = {};

        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
        var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });
        var sapDateTimeFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd HH24:MI:SS" });
        var sapTimeFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "PThh'H'mm'M'ss'S'"});

        return Controller.extend("zuivendorpo.controller.manualcreate", {
            onInit() {
                _this = this;
                this.showLoadingDialog();

                this._aColumns = {};
                this.getCaption();
                this.getColumnProp();

                // Initialize router
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                this._router.getRoute("RouteCreateManualPO").attachPatternMatched(this._routePatternMatched, this);

                this.closeLoadingDialog();
            },

            onExit() {
                console.log("onexit")
            },

            _routePatternMatched: function (oEvent) {
                _sbu = oEvent.getParameter("arguments").sbu; // "VER"; // temporary sbu
                //console.log("_routePatternMatched", _sbu)

                // Get Resources
                this.getResources("VPOManualDocTypeRscSet", "docType", "SBU eq '" + _sbu + "'");
                this.getResources("VPOManualPurchOrgRscSet", "purchOrg", "");
                this.getResources("VPOManualPurchGrpRscSet", "purchGrp", "SBU eq '" + _sbu + "'");
                this.getResources("VPOManualCompanyRscSet", "company", "SBU eq '" + _sbu + "'");
                this.getResources("VPOManualShipModeRscSet", "shipMode", "SBU eq '" + _sbu + "'");
                this.getResources("VPOManualUomRscSet", "uom", "");
                this.getResources("VPOManualOrderNoRscSet", "orderNo", "SBU eq '" + _sbu + "'");

                this.initializeComponent();
            },

            initializeComponent() {
                var oModelStartUp= new sap.ui.model.json.JSONModel();
                oModelStartUp.loadData("/sap/bc/ui2/start_up").then(() => {
                    _startUpInfo = oModelStartUp.oData
                    console.log(oModelStartUp, oModelStartUp.oData);
                    // console.log(oModelStartUp.oData);
                });

                this.getView().setModel(new JSONModel({
                    editModeHeader: false
                }), "ui");

                var sCurrentDate = sapDateFormat.format(new Date());

                _oHeader = {
                    poNumber: "",
                    poDate: sCurrentDate,
                    docType: "",
                    purchOrg: "",
                    vendor: "",
                    purchGrp: "",
                    company: "",
                    purchPlant: "",
                    shipToPlant: "",
                    incoTerms: "",
                    currency: "",
                    payTerms: "",
                    destination: "",
                    shipMode: "",
                    taxCode: "",
                    kbetr: "",
                    okbetr: "",
                    glAccount: "",
                    acctAssCat: "",
                    profitCtr: "",
                    grInd: false,
                    irInd: false,
                    grBasedIV: false,
                    noRangeCd: "",
                }

                // Set current date to PO Date
                var sCurrentDate = sapDateFormat.format(new Date());

                // Set header values
                this.byId("iptPONo").setValue(_oHeader.poNumber);
                this.byId("iptPODate").setValue(sCurrentDate);
                this.byId("cmbDocType").setSelectedKey(_oHeader.docType);
                this.byId("cmbPurchOrg").setSelectedKey(_oHeader.purchOrg);
                this.byId("cmbVendor").setSelectedKey(_oHeader.vendor);
                this.byId("cmbPurchGrp").setSelectedKey(_oHeader.purchGrp);
                this.byId("cmbCompany").setSelectedKey(_oHeader.company);
                this.byId("cmbPurchPlant").setSelectedKey(_oHeader.purchPlant);
                this.byId("cmbShipToPlant").setSelectedKey(_oHeader.shipToPlant);
                this.byId("cmbIncoTerms").setSelectedKey(_oHeader.incoTerms);
                this.byId("iptCurrency").setValue(_oHeader.currency);
                this.byId("cmbPayTerms").setSelectedKey(_oHeader.payTerms);
                this.byId("iptDestination").setValue(_oHeader.destination);
                this.byId("cmbShipMode").setSelectedKey(_oHeader.shipMode);

                this.getView().setModel(new JSONModel({
                    results: []
                }), "detail");

                this.getView().setModel(new JSONModel({
                    results: []
                }), "remarks");

                this.getView().setModel(new JSONModel({
                    results: []
                }), "packInstruct");

                this.byId("detailTab").dataMode = "READ";
                this.byId("remarksTab").dataMode = "READ";
                this.byId("packInstructTab").dataMode = "READ";
                
                this._aInvalidValueState = [];
                this._oDataBeforeChange = {results: []};

                this._tableRendered = "";
                var oTableEventDelegate = {
                    onkeyup: function(oEvent){
                        _this.onKeyUp(oEvent);
                    },

                    onAfterRendering: function(oEvent) {
                        _this.onAfterTableRendering(oEvent);
                    }
                };

                this.byId("detailTab").addEventDelegate(oTableEventDelegate);
                this.byId("remarksTab").addEventDelegate(oTableEventDelegate);
                this.byId("packInstructTab").addEventDelegate(oTableEventDelegate);

                setTimeout(() => {
                    this.onEditHeader()
                }, 1000);
            },

            onAfterTableRendering: function(oEvent) {
                if (this._tableRendered !== "") {
                    this.setActiveRowHighlight(this._tableRendered.replace("Tab", ""));
                    this._tableRendered = "";
                } 
            },

            onSelectTab: function(oEvent) {
                this._tableRendered = oEvent.getSource().getSelectedKey() + "Tab";
                this.setActiveRowHighlight(oEvent.getSource().getSelectedKey());
            },

            onKeyUp(oEvent) {
                if ((oEvent.key == "ArrowUp" || oEvent.key == "ArrowDown") && oEvent.srcControl.sParentAggregationName == "rows") {
                    var oTable = this.byId(oEvent.srcControl.sId).oParent;

                    var sModel = "";
                    if (oTable.getId().indexOf("detailTab") >= 0) sModel = "detail";
                    else if (oTable.getId().indexOf("remarksTab") >= 0) sModel = "remarks";
                    else if (oTable.getId().indexOf("packInstructTab") >= 0) sModel = "packInstruct";

                    if (this.byId(oEvent.srcControl.sId).getBindingContext(sModel)) {
                        var sRowPath = this.byId(oEvent.srcControl.sId).getBindingContext(sModel).sPath;
                        
                        oTable.getModel(sModel).getData().results.forEach(row => row.ACTIVE = "");
                        oTable.getModel(sModel).setProperty(sRowPath + "/ACTIVE", "X"); 
                        
                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext(sModel) && row.getBindingContext(sModel).sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow")
                        })
                    }
                } else if (oEvent.key == "Enter" && oEvent.srcControl.sParentAggregationName == "rows") {
                    // console.log("enter", oEvent, oEvent.srcControl.getParent().mBindingInfos.rows.model)
                    var sModel = oEvent.srcControl.getParent().mBindingInfos.rows.model;
                    if (this.byId(sModel + "Tab").dataMode == "CREATE") {
                        this.onAddRow(sModel);
                    }
                }
            },


            getColumnProp: async function() {
                var sPath = jQuery.sap.getModulePath("zuivendorpo", "/model/columns.json");
        
                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);
    
                var oColumns = oModelColumns.getData();
    
                setTimeout(() => {
                    this.getDynamicColumns(oColumns, "VPOMANUALDTLMOD", "ZDV_VPOMANUALDTL");
                }, 100);

                setTimeout(() => {
                    this.getDynamicColumns(oColumns, "VPOMANUALREMMOD", "ZDV_VPOHDRTXT");
                }, 100);

                setTimeout(() => {
                    this.getDynamicColumns(oColumns, "VPOMANUALPACKMOD", "ZDV_VPOHDRTXT2");
                }, 100);
            },

            getDynamicColumns(arg1, arg2, arg3) {
                var oColumns = arg1;
                var modCode = arg2;
                var tabName = arg3;

                var oJSONColumnsModel = new JSONModel();
                var vSBU = _sbu;

                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                oModel.setHeaders({
                    sbu: vSBU,
                    type: modCode,
                    tabname: tabName
                });
                
                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        console.log(arg2, oData)
                        oJSONColumnsModel.setData(oData);

                        if (oData.results.length > 0) {
                            if (modCode === 'VPOMANUALDTLMOD') {
                                oData.results.forEach(item => {
                                    if (["GRIND", "IRIND", "GRBASEDIV"].includes(item.ColumnName)) {
                                        item.DataType = "BOOLEAN";
                                    }
                                })

                                var aColumns = _this.setTableColumns(oColumns["VPOManualDtl"], oData.results);                               
                                _this._aColumns["detail"] = aColumns["columns"];
                                _this.addColumns(_this.byId("detailTab"), aColumns["columns"], "detail");
                            } else if (modCode === "VPOMANUALREMMOD") {
                                var aColumns = _this.setTableColumns(oColumns["VPOManualDtl"], oData.results);     
                                
                                // Remarks
                                _this._aColumns["remarks"] = aColumns["columns"];
                                _this.addColumns(_this.byId("remarksTab"), aColumns["columns"], "remarks");
                            } else if (modCode === "VPOMANUALPACKMOD") {
                                var aColumns = _this.setTableColumns(oColumns["VPOManualDtl"], oData.results);     
                                
                                // Packing Instruction
                                _this._aColumns["packInstruct"] = aColumns["columns"];
                                _this.addColumns(_this.byId("packInstructTab"), aColumns["columns"], "packInstruct");
                            }
                        }
                    },
                    error: function (err) {
                        _this.closeLoadingDialog();
                    }
                });
            },

            setTableColumns: function(arg1, arg2) {
                //console.log("setTableColumns", arg1, arg2)
                var oColumn = (arg1 ? arg1 : []);
                var oMetadata = arg2;
                //console.log("setTableColumns", oColumn, oMetadata)
                var aSortableColumns = [];
                var aFilterableColumns = [];
                var aColumns = [];

                oMetadata.forEach((prop, idx) => {
                    var vCreatable = prop.Creatable;
                    var vUpdatable = prop.Editable;
                    var vSortable = true;
                    var vSorted = prop.Sorted;
                    var vSortOrder = prop.SortOrder;
                    var vFilterable = true;
                    var vName = prop.ColumnLabel;
                    var oColumnLocalProp = oColumn.filter(col => col.name.toUpperCase() === prop.ColumnName);
                    var vShowable = true;
                    var vOrder = prop.Order;

                    // console.log(prop)
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
                        width: prop.ColumnWidth + 'px',
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
                
                return { columns: aColumns };
            },

            addColumns(table, columns, model) {
                var aColumns = columns.filter(item => item.showable === true)
                aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));

                aColumns.forEach(col => {
                    var sLabel = col.label;
                    // if (model == "packInstruct" && col.name == "REMARKS") {
                    //     sLabel = _oCaption.PACKINSTRUCT;
                    // }

                    if (col.type === "STRING" || col.type === "DATETIME") {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            // id: col.name,
                            width: col.width,
                            sortProperty: col.name,
                            filterProperty: col.name,
                            label: new sap.m.Text({text: sLabel}),
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
                            label: new sap.m.Text({text: sLabel}),
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
                            label: new sap.m.Text({text: sLabel}),
                            template: new sap.m.CheckBox({selected: "{" + model + ">" + col.name + "}", editable: false}),
                            visible: col.visible
                        }));
                    }
                })
            },

            onCreatePO() {
                this.getNumber();
            },

            getDiscRate() {
                var oModel = _this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var oParam = {};
                
                console.log("oheader param", _oHeader)
                oParam["N_GetDiscRateParam"] = [{
                    ConditionType: "RL01",
                    PurchasingOrg: _oHeader.purchOrg,
                    Vendor: _oHeader.vendor,
                    CustomerGroup: "",
                    Forwhatdate: sapDateFormat.format(new Date(_oHeader.poDate))
                }];
                oParam["N_GetDiscRateReturn"] = [];

                //console.log("disc rate param", oParam);
                oModel.create("/GetDiscRateSet", oParam, {
                    method: "POST",
                    success: function(oResult, oResponse) {
                        console.log("GetDiscRateSet", oResult, oResponse);
                        _oHeader.okbetr = oResult.OKbetr;
                        
                        _this.closeLoadingDialog();
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(_oCaption.INFO_EXECUTE_FAIL);
                        _this.closeLoadingDialog();
                    }
                });
            },

            getNumber() {
                var oModel = _this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var oParamGetNumber = {};
                
                oParamGetNumber["N_GetNumberParam"] = [{
                    IUserid: _startUpInfo.id,
                    INorangecd: _oHeader.noRangeCd,
                    IKeycd: ""
                }];
                oParamGetNumber["N_GetNumberReturn"] = [];

                // console.log("oParamGetNumber", oParamGetNumber, _oHeader)
                oModel.create("/GetNumberSet", oParamGetNumber, {
                    method: "POST",
                    success: function(oResult, oResponse) {
                        console.log("GetNumberSet", oResult, oResponse);
                        
                        if (oResult.EReturnno.length > 0) {
                            _this.createPO(oResult.EReturnno);
                        } else {
                            var sMessage = oResult.N_GetNumberReturn.results[0].Type + ' - ' + oResult.N_GetNumberReturn.results[0].Message;
                            sap.m.MessageBox.error(sMessage);
                            _this.closeLoadingDialog();
                        }
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(_oCaption.INFO_EXECUTE_FAIL);
                        _this.closeLoadingDialog();
                    }
                });
            },

            createPO(poNumber) {
                var oModel = _this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");

                // PO Header
                var aParamPOHdr = [];
                var oParamPOHdr = {
                    DocDate: sapDateFormat.format(new Date(_oHeader.poDate)) + "T00:00:00",
                    DocType: _oHeader.docType,
                    DocCat: "",
                    CoCode: _oHeader.company,
                    PurchOrg: _oHeader.purchOrg,
                    PurGroup: _oHeader.purchGrp,
                    Vendor: _oHeader.vendor,
                    PoNumber: poNumber,
                    SupplPlnt: "",
                    Status: "",
                    CreatDate: sapDateFormat.format(new Date(_oHeader.poDate)) + "T00:00:00",
                    CreatedBy: _startUpInfo.id,
                    Pmnttrms: "",
                    Dsnct1To: "0",
                    Dscnt2To: "0",
                    Dscnt3To: "0",
                    Currency: _oHeader.currency,
                    ExchRate: "0",
                    Incoterms1: _oHeader.incoTerms,
                    Incoterms2: _oHeader.destination,
                    OurRef: _oHeader.shipToPlant,
                    DeleteInd: false
                }
                aParamPOHdr.push(oParamPOHdr);

                // PO Details
                var aParamPOItem = [];
                var aParamPOItemSched = [];

                _this.getView().getModel("detail").getData().results.forEach(item => {
                    // PO Item
                    var oParamPOItem = {
                        PoNumber: poNumber,
                        PoItem : item.POITEM,
                        Material: "",
                        InfoRec: "",
                        ItemCat: "",
                        Acctasscat: _oHeader.acctAssCat,
                        MatGrp: "9999",
                        ShortText: item.DESCRIP,
                        Plant: _oHeader.purchPlant,
                        StgeLoc: "",
                        PoUnit: item.UOM,
                        OrderprUn: item.UOM,
                        NetPrice: item.GROSSPRICE,
                        PriceUnit: item.PER,
                        ConvNum1: "1",
                        ConvDen1: "1",
                        DispQuant: item.QTY,
                        GrInd: _oHeader.grInd,
                        IrInd: _oHeader.irInd,
                        GrBasediv: _oHeader.grBasedIV,
                        DeleteInd: "",
                        PreqNo: "",
                        PreqItem: "",
                        PeriodIndExpirationDate: "",
                        KOPrctr: _oHeader.profitCtr,
                        Charg: "",
                        Sakto: item.GLACCOUNT,
                        Aufnr: item.ORDERNO
                    }
                    aParamPOItem.push(oParamPOItem);

                    // PO Item Sched
                    var oParamPOItemSched = {
                        PoNumber: poNumber,
                        PoItem: item.POITEM,
                        SchedLine: "1",
                        DelivDate: item.DELIVERYDT + "T00:00:00",
                        Quantity: item.QTY,
                        PreqNo: "",
                        PreqItem: "",
                        CreateInd: "",
                        ReservNo: "",
                        Batch: "",
                        VendBatch: "",
                        Version: ""
                    }
                    aParamPOItemSched.push(oParamPOItemSched);
                })

                // PO Header Text
                var aParamPOItemText = [];

                // Remarks
                _this.getView().getModel("remarks").getData().results.forEach(item => {
                    var oParamPOItemText = {
                        PoNumber: poNumber,
                        PoItem: item.ITEM.toString().padStart(5, "0"),
                        TextId: "F01",
                        TextForm: "*",
                        TextLine: item.REMARKS
                    }
                    aParamPOItemText.push(oParamPOItemText);
                })

                // Packing Instructions
                _this.getView().getModel("packInstruct").getData().results.forEach(item => {
                    var oParamPOItemText = {
                        PoNumber: poNumber,
                        PoItem: item.ITEM.toString().padStart(5, "0"),
                        TextId: "F06",
                        TextForm: "*",
                        TextLine: item.PACKINSTRUCT
                    }
                    aParamPOItemText.push(oParamPOItemText);
                })

                // PO Cond Header
                var aParamPOCondHdr = [];
                var oParamPOCondHdr = {
                    CondType: "RL01",
                    CondValue: _oHeader.okbetr,
                    Currency: _oHeader.currency,
                    CurrencyIso: _oHeader.currency,
                    Conpricdat: null
                };
                aParamPOCondHdr.push(oParamPOCondHdr);

                var oParam = {};
                oParam["N_CreatePOAddtlDtlsParam"] = [];
                oParam["N_CreatePOClosePRParam"] = [];
                oParam["N_CreatePOCondHdrParam"] = aParamPOCondHdr;
                oParam["N_CreatePOCondParam"] = [];
                oParam["N_CreatePOHdrParam"] = aParamPOHdr;
                oParam["N_CreatePOHdrTextParam"] = [];
                oParam["N_CreatePOItemParam"] = aParamPOItem;
                oParam["N_CreatePOItemSchedParam"] = aParamPOItemSched;
                oParam["N_CreatePOItemTextParam"] = aParamPOItemText;
                oParam["N_CreatePOReturn"] = [];

                console.log("createpo param", oParam)
                oModel.create("/CreatePOSet", oParam, {
                    method: "POST",
                    success: function(oResult, oResponse) {
                        console.log("CreatePOSet", oResult, oResponse);
                        
                        if (oResult["N_CreatePOReturn"].results.length > 0 && oResult["N_CreatePOReturn"].results[0].Type == "S") {
                            _this.closeLoadingDialog();
                            sap.m.MessageBox.information(oResult["N_CreatePOReturn"].results[0].Message,{
                                onClose: function(sAction) {
                                    _this.navBack();
                                }
                            });
                        } else {
                            var sMessage = "";
                            oResult["N_CreatePOReturn"].results.forEach(item => {
                                sMessage += item.Message + "\n";
                            })

                            sap.m.MessageBox.error(sMessage);
                            _this.closeLoadingDialog();
                        }
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(_oCaption.INFO_EXECUTE_FAIL);
                        _this.closeLoadingDialog();
                    }
                });
            },

            navBack() {
                var oHistory = sap.ui.core.routing.History.getInstance();
                var sPreviousHash = oHistory.getPreviousHash();

                if (sPreviousHash !== undefined) {
                    window.history.go(-1);
                } else {
                    var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                    oRouter.navTo("Routemain", {}, true);
                }
            },

            onEditHeader() {
                
                // Set Placeholder
                if (!this.byId("cmbPurchOrg").getSelectedKey()) {
                    this.byId("cmbVendor").setPlaceholder(_oCaption.PURCHORG + " is required.");
                    this.byId("cmbShipToPlant").setPlaceholder(_oCaption.PURCHORG + " is required.");
                } else {
                    this.byId("cmbVendor").setPlaceholder("");
                    this.byId("cmbShipToPlant").setPlaceholder("");
                }

                if (!this.byId("cmbVendor").getSelectedKey()) {
                    this.byId("cmbIncoTerms").setPlaceholder(_oCaption.VENDOR + " is required.");
                    this.byId("cmbPayTerms").setPlaceholder(_oCaption.VENDOR + " is required.");
                } else {
                    this.byId("cmbIncoTerms").setPlaceholder("");
                    this.byId("cmbPayTerms").setPlaceholder("");
                }

                if (!this.byId("cmbCompany").getSelectedKey()) {
                    this.byId("cmbPurchPlant").setPlaceholder(_oCaption.COMPANY + " is required.");
                } else {
                    this.byId("cmbPurchPlant").setPlaceholder("");
                }

                this.setControlEditMode("header", true)
            },

            onCloseHeader() {
                sap.m.MessageBox.confirm(_oCaption.CONFIRM_PROCEED_CLOSE, {
                    actions: ["Yes", "No"],
                    onClose: function (sAction) {
                        if (sAction == "Yes") {    
                            _this.navBack();         
                        }
                    }
                });
            },

            onSaveHeader() {
                // Validation
                var sErrMsg = "";

                if (!this.byId("cmbDocType").getSelectedKey()) sErrMsg = _oCaption.DOCTYPE;
                else if (!this.byId("cmbPurchOrg").getSelectedKey()) sErrMsg = _oCaption.PURCHORG;
                else if (!this.byId("cmbVendor").getSelectedKey()) sErrMsg = _oCaption.VENDOR;
                else if (!this.byId("cmbPurchGrp").getSelectedKey()) sErrMsg = _oCaption.PURCHGRP;
                else if (!this.byId("cmbCompany").getSelectedKey()) sErrMsg = _oCaption.COMPANY;
                else if (!this.byId("cmbPurchPlant").getSelectedKey()) sErrMsg = _oCaption.PURCHPLANT;
                else if (!this.byId("cmbShipToPlant").getSelectedKey()) sErrMsg = _oCaption.SHIPTOPLANT;
                else if (!this.byId("cmbIncoTerms").getSelectedKey()) sErrMsg = _oCaption.INCOTERMS;
                else if (!this.byId("cmbPayTerms").getSelectedKey()) sErrMsg = _oCaption.PAYTERMS;
                else if (!this.byId("iptDestination").getValue()) sErrMsg = _oCaption.DESTINATION;
                else if (!this.byId("cmbShipMode").getSelectedKey()) sErrMsg = _oCaption.SHIPMODE;

                if (sErrMsg.length > 0) {
                    sErrMsg += " is required."
                    sap.m.MessageBox.warning(sErrMsg);
                    return;
                }

                _oHeader.docType = this.byId("cmbDocType").getSelectedKey();
                _oHeader.purchOrg = this.byId("cmbPurchOrg").getSelectedKey();
                _oHeader.vendor = this.byId("cmbVendor").getSelectedKey();
                _oHeader.purchGrp = this.byId("cmbPurchGrp").getSelectedKey();
                _oHeader.company = this.byId("cmbCompany").getSelectedKey();
                _oHeader.purchPlant = this.byId("cmbPurchPlant").getSelectedKey();
                _oHeader.shipToPlant = this.byId("cmbShipToPlant").getSelectedKey();
                _oHeader.incoTerms = this.byId("cmbIncoTerms").getSelectedKey();
                _oHeader.currency = this.byId("iptCurrency").getValue();
                _oHeader.payTerms = this.byId("cmbPayTerms").getSelectedKey();
                _oHeader.destination = this.byId("iptDestination").getValue();
                _oHeader.shipMode = this.byId("cmbShipMode").getSelectedKey();

                this.getResources("VPOManualTaxSet", "taxCode", "PURCHORG eq '" + _oHeader.purchOrg + "' and VENDORCD eq '" + _oHeader.vendor + "'")
                this.getResources("VPOManualZCheckSet", "glAccount", "SBU eq '" + _sbu + "' and FIELD1 eq 'GLACCT' and FIELD2 eq '" + _oHeader.shipToPlant + "'");
                this.getResources("VPOManualZCheckSet", "acctAssCat", "SBU eq '" + _sbu + "' and FIELD1 eq '" + _oHeader.docType + "' and FIELD2 eq 'ACCTASS'");
                
                this.getDiscRate();
                this.setControlEditMode("header", false);
            },

            onCancelHeader() {
                sap.m.MessageBox.confirm(_oCaption.CONFIRM_DISREGARD_CHANGE, {
                    actions: ["Yes", "No"],
                    onClose: function (sAction) {
                        if (sAction == "Yes") {          
                            _this.setControlEditMode("header", false)

                            // Set header values
                            _this.byId("iptPONo").setValue(_oHeader.poNumber);
                            _this.byId("iptPODate").setValue(_oHeader.poDate);
                            _this.byId("cmbDocType").setSelectedKey(_oHeader.docType);
                            _this.byId("cmbPurchOrg").setSelectedKey(_oHeader.purchOrg);
                            _this.byId("cmbVendor").setSelectedKey(_oHeader.vendor);
                            _this.byId("cmbPurchGrp").setSelectedKey(_oHeader.purchGrp);
                            _this.byId("cmbCompany").setSelectedKey(_oHeader.company);
                            _this.byId("cmbPurchPlant").setSelectedKey(_oHeader.purchPlant);
                            _this.byId("cmbShipToPlant").setSelectedKey(_oHeader.shipToPlant);
                            _this.byId("cmbIncoTerms").setSelectedKey(_oHeader.incoTerms);
                            _this.byId("iptCurrency").setValue(_oHeader.currency);
                            _this.byId("cmbPayTerms").setSelectedKey(_oHeader.payTerms);
                            _this.byId("iptDestination").setValue(_oHeader.destination);
                            _this.byId("cmbShipMode").setSelectedKey(_oHeader.shipMode);
                        }
                    }
                });
            },

            onCancel(pModel) {
                sap.m.MessageBox.confirm(_oCaption.CONFIRM_DISREGARD_CHANGE, {
                    actions: ["Yes", "No"],
                    onClose: function (sAction) {
                        if (sAction == "Yes") {    
                            _this.byId(pModel + "Tab").dataMode = "READ";      
                            _this.setControlEditMode(pModel, false)
                            _this.getView().getModel(pModel).setProperty("/", _this._oDataBeforeChange);
                            _this._oDataBeforeChange = {results: []};
                            _this._aInvalidValueState = [];
                        }
                    }
                });
            },

            onCreate(arg) {
                this.byId(arg + "Tab").dataMode = "CREATE";
                this.setControlEditMode(arg, true);
                this.setRowCreateMode(arg);
            },

            onAddRow(arg) {
                this.setRowCreateMode(arg);
            },

            onRemoveRow(pModel) {
                var oTable = this.byId(pModel + "Tab");
                var aNewRows = this.getView().getModel(pModel).getData().results.filter(item => item.NEW === true);
                aNewRows.splice(oTable.getSelectedIndices(), 1);
                this.getView().getModel(pModel).setProperty("/results", aNewRows);
            },

            onEdit(arg) {
                this.byId(arg + "Tab").dataMode = "EDIT";
                this.setControlEditMode(arg, true);
                this.setRowEditMode(arg);
            },

            onDelete(arg) {
                var oTable = this.byId(arg + "Tab");
                var aSelRows = oTable.getSelectedIndices();
                
                if (aSelRows.length === 0) {
                    MessageBox.information(_oCaption.INFO_NO_RECORD_SELECT);
                }
                else {
                    MessageBox.confirm(_oCaption.INFO_PROCEED_DELETE, {
                        actions: ["Yes", "No"],
                        onClose: function (sAction) {
                            if (sAction === "Yes") {
                                var aRows = this.getView().getModel(arg).getData().results;
                                aRows.splice(oTable.getSelectedIndices(), 1);
                                this.getView().getModel(pModel).setProperty("/results", aRows);
                            }
                        }
                    });
                }
            },

            onSave(arg) {
                // _this.showLoadingDialog("Loading...");

                if (this._aInvalidValueState.length > 0) {
                    var bCompact = true;

                    sap.m.MessageBox.error(_oCaption.INFO_INVALID_SAVE,
                        {
                            styleClass: bCompact ? "sapUiSizeCompact" : ""
                        }
                    );
                    // _this.closeLoadingDialog();
                    return;
                }
                
                var aNewRows = this.getView().getModel(arg).getData().results.filter(item => item.NEW === true);
                var aEditedRows = this.getView().getModel(arg).getData().results.filter(item => item.EDITED === true);
                
                var aNewEditRows = aNewRows.length > 0 ? aNewRows : aEditedRows;

                // console.log("onSave", aNewEditRows);
                // Validate required field if has value.
                var isValid = true;
                var sInvalidMsg = "";
                var aRequiredFields = this._aColumns[arg].filter(x => x.required).map(x => x.name);
                
                for (var i = 0; i < aRequiredFields.length; i++) {
                    var sRequiredField = aRequiredFields[i];
                    if (aNewEditRows.filter(x => !x[sRequiredField]).length > 0) {
                        isValid = false;
                        sInvalidMsg = "\"" + this._aColumns[arg].filter(x => x.name == sRequiredField)[0].label + "\" is required."
                        break;
                    }
                }
                
                if (!isValid) {
                    var bCompact = true;
                    sap.m.MessageBox.error(sInvalidMsg,
                        {
                            styleClass: bCompact ? "sapUiSizeCompact" : ""
                        }
                    );

                    // _this.closeLoadingDialog();
                    return;
                }
                
                this.getView().getModel(arg).getData().results.forEach((item, idx) => {
                    if (item.NEW || item.EDITED) {
                        item.NEW = false;
                        item.EDITED = false
                    }
                })
                
                var aData = {results: []};
                var aDataAfterChange = jQuery.extend(true, {}, this.getView().getModel(arg).getData());
                
                _this._oDataBeforeChange.results.forEach(item => {
                    aData.results.push(item);
                });
                
                aDataAfterChange.results.forEach(item => {
                    aData.results.push(item);
                });
                
                _this.getView().getModel(arg).setProperty("/", aData);
                _this._oDataBeforeChange = {results: []};

                this.byId(arg + "Tab").dataMode = "READ";
                this.setControlEditMode(arg, false);
                _this._aInvalidValueState = [];
                // _this.closeLoadingDialog();
            },

            setRowReadMode(arg) {
                var oTable = this.byId(arg + "Tab");
                oTable.getColumns().forEach((col, idx) => {                    
                    this._aColumns[arg].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            if (ci.type === "STRING" || ci.type === "NUMBER" || ci.type === "DATETIME") {
                                col.setTemplate(new sap.m.Text({
                                    text: "{" + arg + ">" + ci.name + "}",
                                    wrapping: false,
                                    tooltip: "{" + arg + ">" + ci.name + "}"
                                }));
                            }
                            else if (ci.type === "BOOLEAN") {
                                col.setTemplate(new sap.m.CheckBox({selected: "{" + arg + ">" + ci.name + "}", editable: false}));
                            }

                            if (ci.required) {
                                col.getLabel().removeStyleClass("requiredField");
                            }
                        })  
                })

                // Reapply filter
                var aFilters = [];
                if (_this.getView().byId(arg + "Tab").getBinding("rows")) {
                    aFilters = _this.getView().byId(arg + "Tab").getBinding("rows").aFilters;
                }

                //var sFilterGlobal = _this.getView().byId("searchField" + arg[0].toUpperCase() + arg.slice(1)).getProperty("value");
                //_this.onRefreshFilter(arg, aFilters, sFilterGlobal);
            },

            setRowCreateMode(arg) {
                var aNewRows = this.getView().getModel(arg).getData().results.filter(item => item.NEW === true);
                if (aNewRows.length == 0) {
                    this._oDataBeforeChange = jQuery.extend(true, {}, this.getView().getModel(arg).getData());
                }
                
                var oNewRow = {};
                var oTable = this.byId(arg + "Tab");                
                oTable.getColumns().forEach((col, idx) => {
                    this._aColumns[arg].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            if (!ci.hideOnChange && ci.creatable) {
                                if (ci.type === "BOOLEAN") {
                                    col.setTemplate(new sap.m.CheckBox({selected: "{" + arg + ">" + ci.name + "}", 
                                        select: this.onCheckBoxChange.bind(this),    
                                        editable: true
                                    }));
                                }
                                else if (ci.valueHelp["show"]) {
                                    col.setTemplate(new sap.m.Input({
                                        type: "Text",
                                        value: "{" + arg + ">" + ci.name + "}",
                                        maxLength: +ci.maxLength,
                                        showValueHelp: true,
                                        valueHelpRequest: this.handleValueHelp.bind(this),
                                        showSuggestion: true,
                                        maxSuggestionWidth: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].maxSuggestionWidth : "1px",
                                        suggestionItems: {
                                            path: ci.valueHelp["suggestionItems"].path,
                                            length: 1000,
                                            template: new sap.ui.core.ListItem({
                                                key: ci.valueHelp["suggestionItems"].text,
                                                text: ci.valueHelp["suggestionItems"].text,
                                                additionalText: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].additionalText : '',
                                            }),
                                            templateShareable: false
                                        },
                                        change: this.onValueHelpLiveInputChange.bind(this)
                                    }));
                                }
                                else if (ci.type === "NUMBER") {
                                    col.setTemplate(new sap.m.Input({
                                        type: sap.m.InputType.Number,
                                        textAlign: sap.ui.core.TextAlign.Right,
                                        value: "{path:'" + arg + ">" + ci.name + "', type:'sap.ui.model.odata.type.Decimal', formatOptions:{ minFractionDigits:" + ci.scale + ", maxFractionDigits:" + ci.scale + " }, constraints:{ precision:" + ci.precision + ", scale:" + ci.scale + " }}",
                                        liveChange: this.onNumberLiveChange.bind(this)
                                    }));
                                }
                                else if (ci.type === "DATETIME") {
                                    col.setTemplate(new sap.m.DatePicker({
                                        value: "{" + arg + ">" + ci.name + "}",
                                        valueFormat: "yyyy-MM-dd",
                                        displayFormat: "short",
                                        change: this.onDateChange.bind(this)
                                    }));
                                }
                                else {
                                    if (ci.maxLength !== null) {
                                        col.setTemplate(new sap.m.Input({
                                            value: "{" + arg + ">" + ci.name + "}",
                                            maxLength: +ci.maxLength,
                                            liveChange: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                    else {
                                        col.setTemplate(new sap.m.Input({
                                            value: "{" + arg + ">" + ci.name + "}",
                                            liveChange: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                }
                            } 

                            if (ci.required) {
                                col.getLabel().addStyleClass("requiredField");
                            }

                            if (ci.type === "STRING") oNewRow[ci.name] = "";
                            //else if (ci.type === "NUMBER") oNewRow[ci.name] = "0";
                            else if (ci.type === "BOOLEAN") oNewRow[ci.name] = false;
                        })
                }) 
                
                oNewRow["NEW"] = true;

                if (arg == "detail") {
                    oNewRow["POITEM"] = ((aNewRows.length + this._oDataBeforeChange.results.length + 1) * 10).toString();
                    oNewRow["ACCTASSCAT"] = _oHeader.acctAssCat;
                    oNewRow["PROFITCENTER"] = _oHeader.profitCtr;
                    oNewRow["GRIND"] = _oHeader.grInd;
                    oNewRow["IRIND"] = _oHeader.irInd;
                    oNewRow["GRBASEDIV"] = _oHeader.grBasedIV;
                    oNewRow["TAXCODE"] = _oHeader.taxCode;
                    oNewRow["GLACCOUNT"] = _oHeader.glAccount;
                } else if (arg == "remarks" || arg == "packInstruct") {
                    oNewRow["ITEM"] = (aNewRows.length + this._oDataBeforeChange.results.length + 1).toString();
                }

                aNewRows.push(oNewRow);
                this.getView().getModel(arg).setProperty("/results", aNewRows);

                // Remove filter
                this.byId(arg + "Tab").getBinding("rows").filter(null, "Application");
            },

            setRowEditMode(arg) {
                this.getView().getModel(arg).getData().results.forEach(item => item.EDITED = false);

                var oTable = this.byId(arg + "Tab");

                oTable.getColumns().forEach((col, idx) => {
                    this._aColumns[arg].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            if (!ci.hideOnChange && ci.updatable) {
                                if (ci.type === "BOOLEAN") {
                                    col.setTemplate(new sap.m.CheckBox({selected: "{" + arg + ">" + ci.name + "}", 
                                        select: this.onCheckBoxChange.bind(this),    
                                        editable: true
                                    }));
                                }
                                else if (ci.valueHelp["show"]) {
                                    col.setTemplate(new sap.m.Input({
                                        // id: "ipt" + ci.name,
                                        type: "Text",
                                        value: "{" + arg + ">" + ci.name + "}",
                                        maxLength: +ci.maxLength,
                                        showValueHelp: true,
                                        valueHelpRequest: this.handleValueHelp.bind(this),
                                        showSuggestion: true,
                                        maxSuggestionWidth: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].maxSuggestionWidth : "1px",
                                        suggestionItems: {
                                            path: ci.valueHelp["items"].path, //ci.valueHelp.model + ">/items", //ci.valueHelp["suggestionItems"].path,
                                            length: 1000,
                                            template: new sap.ui.core.ListItem({
                                                key: "{" + ci.valueHelp["items"].value + "}", //"{" + ci.valueHelp.model + ">" + ci.valueHelp["items"].value + "}",
                                                text: "{" + ci.valueHelp["items"].value + "}", //"{" + ci.valueHelp.model + ">" + ci.valueHelp["items"].value + "}", //ci.valueHelp["suggestionItems"].text
                                                additionalText: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].additionalText : '',
                                            }),
                                            templateShareable: false
                                        },
                                        change: this.onValueHelpLiveInputChange.bind(this)
                                    }));
                                }
                                else if (ci.type === "NUMBER") {
                                    col.setTemplate(new sap.m.Input({
                                        type: sap.m.InputType.Number,
                                        textAlign: sap.ui.core.TextAlign.Right,
                                        value: "{path:'" + arg + ">" + ci.name + "', type:'sap.ui.model.odata.type.Decimal', formatOptions:{ minFractionDigits:" + ci.scale + ", maxFractionDigits:" + ci.scale + " }, constraints:{ precision:" + ci.precision + ", scale:" + ci.scale + " }}",
                                        liveChange: this.onNumberLiveChange.bind(this)
                                    }));
                                }
                                else if (ci.type === "DATETIME") {
                                    col.setTemplate(new sap.m.DatePicker({
                                        value: "{" + arg + ">" + ci.name + "}",
                                        valueFormat: "yyyy-MM-dd",
                                        displayFormat: "short",
                                        change: this.onDateChange.bind(this)
                                    }));
                                }
                                else {
                                    if (ci.maxLength !== null) {
                                        col.setTemplate(new sap.m.Input({
                                            value: "{" + arg + ">" + ci.name + "}",
                                            maxLength: +ci.maxLength,
                                            liveChange: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                    else {
                                        col.setTemplate(new sap.m.Input({
                                            value: "{" + arg + ">" + ci.name + "}",
                                            liveChange: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                }                                
                            }

                            if (ci.required) {
                                col.getLabel().addStyleClass("requiredField");
                            }
                        })
                })
            },

            onInputLiveChange: function(oEvent) {
                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                var sModel = oSource.getBindingInfo("value").parts[0].model;

                this.getView().getModel(sModel).setProperty(sRowPath + '/EDITED', true);
            },

            onNumberLiveChange: function(oEvent) {
                console.log(oEvent.getParameters())
                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                var sModel = oSource.getBindingInfo("value").parts[0].model;

                this.getView().getModel(sModel).setProperty(sRowPath + '/EDITED', true);
                if (oSource.getBindingInfo("value").parts[0].path == "GROSSPRICE") {
                    var sValue;

                    if (_oHeader.taxCode == "") sValue = oEvent.getParameters().value;
                    else {
                        sValue = (parseFloat(oEvent.getParameters().value) / (1 + (parseFloat(_oHeader.kbetr) / 1000))).toFixed(2);
                    }

                    this.getView().getModel(sModel).setProperty(sRowPath + '/NETPRICE', sValue);
                }
            },

            onDateChange(oEvent) {
                var oSource = oEvent.getSource();
                var sModel = Object.getOwnPropertyNames(oSource.oParent.oBindingContexts)[0];
                var sRowPath = oSource.oParent.oBindingContexts[sModel].sPath;
                var sColumn = "DELIVERYDT";
                var sValue = oEvent.getParameters().newValue;

                //console.log("ondate", oSource, sModel, sRowPath, sRowPath + '/' + sColumn, sValue)
                this.getView().getModel(sModel).setProperty(sRowPath + '/' + sColumn, sValue);
                this.getView().getModel(sModel).setProperty(sRowPath + '/EDITED', true);
            },

            onValueHelpLiveInputChange: function(oEvent) {
                var oSource = oEvent.getSource();
                // console.log("onInputChange", oEvent, oSource)
                var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
                oSource.setValueState(isInvalid ? "Error" : "None");
                console.log("onValueHelpLiveInputChange", isInvalid, "TEST", oSource.getSelectedKey(), "TEST2", oSource.getValue().trim())
                if (!oSource.getSelectedKey()) {
                    console.log("test", oSource.getSuggestionItems())
                    oSource.getSuggestionItems().forEach(item => {
                        console.log(item.getProperty("key"), oSource.getValue().trim())
                        if (item.getProperty("key") === oSource.getValue().trim()) {
                            isInvalid = false;
                            oSource.setValueState(isInvalid ? "Error" : "None");
                        }
                    })
                }
                console.log("onValueHelpLiveInputChange2", isInvalid, oSource.getId())
                this.addRemoveValueState(!isInvalid, oSource.getId());

                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                var sModel = oSource.getBindingInfo("value").parts[0].model;
                var sColumn = oSource.getBindingInfo("value").parts[0].path;
                this.getView().getModel(sModel).setProperty(sRowPath + '/' + sColumn, oSource.mProperties.selectedKey);
                this.getView().getModel(sModel).setProperty(sRowPath + '/EDITED', true);

                // console.log("onValueHelpLiveInputChange", sColumn, oSource.mProperties.selectedKey)
                if (sColumn == "UOM") {
                    this.getView().getModel(sModel).setProperty(sRowPath + '/ORDERPRICEUNIT', oSource.mProperties.selectedKey);
                }
            },

            handleValueHelp: function(oEvent) {
                var oModel = this.getOwnerComponent().getModel();
                var oSource = oEvent.getSource();
                var sEntity = oSource.getBindingInfo("suggestionItems").path;
                var sModel = oSource.getBindingInfo("value").parts[0].model;

                this._inputId = oSource.getId();
                this._inputValue = oSource.getValue();
                this._inputSource = oSource;
                this._inputField = oSource.getBindingInfo("value").parts[0].path;

                if (sEntity.includes("/results")) {
                    var vCellPath = _this._inputField;
                    var vColProp = _this._aColumns[sModel].filter(item => item.name === vCellPath);
                    var vItemValue = vColProp[0].valueHelp.items.value;
                    var vItemDesc = vColProp[0].valueHelp.items.text;

                    var listModel = oSource.getBindingInfo("suggestionItems").model;
                    _this.getView().getModel(listModel).getData().results.forEach(item => {
                        item.VHTitle = item[vItemValue];
                        item.VHDesc = item[vItemDesc];
                        item.VHSelected = (item[vItemValue] === _this._inputValue);
                    });

                    if (!_this._valueHelpDialog) {
                    
                        _this._valueHelpDialog = sap.ui.xmlfragment(
                            "zuivendorpo.view.fragments.dialog.ValueHelpDialog",
                            _this
                        );
    
                        _this._valueHelpDialog.setModel(
                            new JSONModel({
                                items: _this.getView().getModel(listModel).getData().results,
                                title: vColProp[0].label,
                                table: sModel
                            })
                        )
    
                        _this.getView().addDependent(_this._valueHelpDialog);
                    } else {
                        _this._valueHelpDialog.setModel(
                            new JSONModel({
                                items: _this.getView().getModel(listModel).getData().results,
                                title: vColProp[0].label,
                                table: sModel
                            })
                        )
    
                        _this.getView().addDependent(_this._valueHelpDialog); 
                    }
                    
                    _this._valueHelpDialog.open();  
                }
                else {
                    var vCellPath = _this._inputField;
                    var vColProp = _this._aColumns[sModel].filter(item => item.name === vCellPath);
                    var vItemValue = vColProp[0].valueHelp.items.value;
                    var vItemDesc = vColProp[0].valueHelp.items.text;

                    var sFilter = "";

                    if (vCellPath == "ORDERNO") {
                        sFilter = "SBU eq '" + _sbu + "'";
                    }

                    oModel.read(sEntity, {
                        urlParameters: {
                            "$filter": sFilter
                        },
                        success: function (data, response) {

                            data.results.forEach(item => {
                                item.VHTitle = item[vItemValue];
                                item.VHDesc = item[vItemDesc];
                                item.VHSelected = (item[vItemValue] === _this._inputValue);
                            });
   
                            // create value help dialog
                            if (!_this._valueHelpDialog) {
                                _this._valueHelpDialog = sap.ui.xmlfragment(
                                    "zuivendorpo.view.fragments.dialog.ValueHelpDialog",
                                    _this
                                );

                                _this._valueHelpDialog.setModel(
                                    new JSONModel({
                                        items: data.results,
                                        title: vColProp[0].label,
                                        table: sModel
                                    })
                                )

                                _this.getView().addDependent(_this._valueHelpDialog);
                            }
                            else {
                                _this._valueHelpDialog.setModel(
                                    new JSONModel({
                                        items: data.results,
                                        title: vColProp[0].label,
                                        table: sModel
                                    })
                                )
                            }                            

                            _this._valueHelpDialog.open();
                        },
                        error: function (err) { 
                            _this.closeLoadingDialog();
                        }
                    })
                }
                
            },

            handleValueHelpSearch : function (oEvent) {
                var sValue = oEvent.getParameter("value");

                var oFilter = new sap.ui.model.Filter({
                    filters: [
                        new sap.ui.model.Filter("VHTitle", sap.ui.model.FilterOperator.Contains, sValue),
                        new sap.ui.model.Filter("VHDesc", sap.ui.model.FilterOperator.Contains, sValue)
                    ],
                    and: false
                });

                oEvent.getSource().getBinding("items").filter([oFilter]);
            },
    
            handleValueHelpClose : function (oEvent) {               
                if (oEvent.sId === "confirm") {                  
                    var oSelectedItem = oEvent.getParameter("selectedItem");               
                    //var sTable = this._oViewSettingsDialog["zuimattype3.view.fragments.ValueHelpDialog"].getModel().getData().table;
                    var sTable = this._valueHelpDialog.getModel().getData().table;

                    if (oSelectedItem) {
                        this._inputSource.setValue(oSelectedItem.getTitle());
    
                        if (this._inputValue !== oSelectedItem.getTitle()) {
                            var sRowPath = this._inputSource.getBindingInfo("value").binding.oContext.sPath;
                            this.getView().getModel(sTable).setProperty(sRowPath + '/EDITED', true);

                            if (this._inputSource.mBindingInfos.value.parts[0].path == "UOM") {
                                this.getView().getModel(sTable).setProperty(sRowPath + '/ORDERPRICEUNIT', 
                                    oEvent.getParameters().selectedItem.mProperties.title);
                            }
                        }
                    }

                    this._inputSource.setValueState("None");
                    this.addRemoveValueState(true, this._inputSource.getId());
                }
                else if (oEvent.sId === "cancel") {
                    // console.log(oEvent.getSource().getBinding("items"));
                    // var source = oEvent.getSource().getBinding("items").oList;
                    // var data = source.filter(item => item.VHSelected === true);
                    // var value = "";

                    // if (data.length > 0) {
                    //     value = data[0].VHTitle;
                    // }

                    // this._inputSource.setValue(value);

                    // if (this._inputValue !== value) {
                    //     var data = this.byId("headerTable").getBinding("items").oList;                           
                    //     data.filter(item => item[this.inputField] === oSelectedItem.getTitle()).forEach(e => e.EDITED = true);
                    // }
                }
            },

            addRemoveValueState(pIsValid, pId) {
                //console.log("addRemoveValueState", this._aInvalidValueState, pIsValid, pId)
                if (!pIsValid) {
                    if (!this._aInvalidValueState.includes(pId)) {
                        this._aInvalidValueState.push(pId);
                    }
                } else {
                    if (this._aInvalidValueState.includes(pId)) {
                        for(var i = this._aInvalidValueState.length - 1; i >= 0; i--) {
                            if (this._aInvalidValueState[i] == pId){
                                this._aInvalidValueState.splice(i, 1)
                            }
                            
                        }
                    }
                }
            },

            getResources(pEntitySet, pModel, pFilter) {
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oEntitySet = "/" + pEntitySet;
                var oFilter = (pFilter ? { "$filter": pFilter } : {} )

                oModel.read(oEntitySet, {
                    urlParameters: oFilter,
                    success: function (data, response) {
                        console.log("getResources success", pModel, data, pFilter)
                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, pModel);

                        if (pModel == "taxCode" && data.results.length > 0) {
                            _oHeader.taxCode = data.results[0].TAXCODE;
                            _oHeader.kbetr = data.results[0].KBETR;
                        } else if (pModel == "glAccount" && data.results.length > 0) {
                            _oHeader.glAccount = data.results[0].FIELD3;
                        } else if (pModel == "acctAssCat" && data.results.length > 0) {
                            _oHeader.acctAssCat = data.results[0].FIELD3;
                            console.log("final oheader", _oHeader)
                        } else if (pModel == "vendor") {
                            if (data.results.length > 0) _this.byId("cmbVendor").setPlaceholder("");
                            else _this.byId("cmbVendor").setPlaceholder("No data for selected " + _oCaption.PURCHORG);
                        } else if (pModel == "shipToPlant") {
                            if (data.results.length > 0) _this.byId("cmbShipToPlant").setPlaceholder("");
                            else _this.byId("cmbShipToPlant").setPlaceholder("No data for selected " + _oCaption.PURCHORG);
                        } else if (pModel == "incoTerms") {
                            if (data.results.length > 0) _this.byId("cmbIncoTerms").setPlaceholder("");
                            else _this.byId("cmbIncoTerms").setPlaceholder("No data for selected " + _oCaption.VENDOR);
                        } else if (pModel == "payTerms") {
                            if (data.results.length > 0) _this.byId("cmbPayTerms").setPlaceholder("");
                            else _this.byId("cmbPayTerms").setPlaceholder("No data for selected " + _oCaption.VENDOR);
                        } else if (pModel == "purchPlant") {
                            if (data.results.length > 0) _this.byId("cmbPurchPlant").setPlaceholder("");
                            else _this.byId("cmbPurchPlant").setPlaceholder("No data for selected " + _oCaption.COMPANY);
                        }
                    },
                    error: function (err) { 
                        // console.log("getResources err", err )
                    }
                })
            },

            onDropdownSelectionChange(oEvent) {
                // console.log("onDropdownSelectionChange", oEvent.getSource(), oEvent.getParameters())

                var oSource = oEvent.getSource();
                var oParameters = oEvent.getParameters();
                var sModel = oSource.mBindingInfos.items.model;
                var sKey = oSource.mProperties.selectedKey;
                var oSelectedItem = oParameters.selectedItem.mProperties;

                // console.log(this.byId(oEvent.getSource().getId()))
                // this.byId(oEvent.getSource().getId()).setValue(oSelectedItem.text + " - " + oSelectedItem.additionalText);

                if (sModel == "docType") {
                    var oDocType = (this.getView().getModel(sModel).getData().results.filter(x => x.DOCTYPE == sKey))[0];
                    _oHeader.noRangeCd = oDocType.NORANGECD;
                    _oHeader.grInd = (oDocType.GRIND == "" ? true : false);
                    _oHeader.irInd = (oDocType.IRIND == "" ? true : false);
                    _oHeader.grBasedIV = (oDocType.GRBASEDIV == "" ? true : false);
                } else if (sModel == "purchOrg") {
                    this.getResources("VPOManualVendorRscSet", "vendor", "PURCHORG eq '" + sKey + "'");
                    // this.byId("cmbVendor").setEditable(true);

                    this.getResources("VPOManualShipToPlantRscSet", "shipToPlant", "PURCHORG eq '" + sKey + "'");
                    // this.byId("cmbShipToPlant").setEditable(true);
                } else if (sModel == "vendor") {
                    this.getResources("VPOManualIncoRscSet", "incoTerms", "");
                    this.getResources("VPOManualPayTermsRscSet", "payTerms", "");

                    var oVendor = (this.getView().getModel(sModel).getData().results.filter(x => x.VENDORCD == sKey))[0];
                    //console.log("oVendor", oVendor)

                    // this.byId("cmbIncoTerms").setEditable(true);
                    // this.byId("cmbPayTerms").setEditable(true);
                    // this.byId("iptDestination").setEditable(true);

                    // this.byId("iptVendor").setValue(oVendor.VENDORNAME);
                    //this.byId("cmbIncoTerms").setValue(oVendor.INCOTERMS);
                    this.byId("cmbIncoTerms").setSelectedKey(oVendor.INCOTERMS);
                    this.byId("iptCurrency").setValue(oVendor.CURRENCY);
                    this.byId("cmbPayTerms").setSelectedKey(oVendor.PAYTERMS);
                    this.byId("iptDestination").setValue(oVendor.DESTINATION);
                } else if (sModel == "company") {
                    this.getResources("VPOManualPurchPlantRscSet", "purchPlant", "COMPANYCD eq '" + sKey + "'");
                    // this.byId("cmbPurchPlant").setEditable(true);
                } else if (sModel == "shipToPlant") {
                    var oShipToPlant = (this.getView().getModel(sModel).getData().results.filter(x => x.PLANTCD == sKey))[0];
                    _oHeader.profitCtr = oShipToPlant.PROFITCTR;
                }

                // console.log("onDropdownSelectionChange", oEvent.getSource(), oEvent.getParameters(), oSource.getBindingContext())
            },

            setReqField(pType, pEditable) {
                if (pType == "header") {
                    var fields = ["feDocType", "fePurchOrg", "feVendor", "fePurchGrp", "feCompany", "fePurchPlant", "feShipToPlant",
                                "feIncoTerms", "fePayTerms", "feDestination", "feShipMode"];

                    fields.forEach(id => {
                        if (pEditable) {
                            this.byId(id).setLabel("*" + this.byId(id).getLabel());
                            this.byId(id)._oLabel.addStyleClass("requiredField");
                        } else {
                            this.byId(id).setLabel(this.byId(id).getLabel().replaceAll("*", ""));
                            this.byId(id)._oLabel.removeStyleClass("requiredField");
                        }
                    })
                } else {
                    var oTable = this.byId(pType + "Tab");

                    oTable.getColumns().forEach((col, idx) => {
                        if (col.getLabel().getText().includes("*")) {
                            col.getLabel().setText(col.getLabel().getText().replaceAll("*", ""));
                        }   

                        this._aColumns[pType].filter(item => item.label === col.getLabel().getText())
                            .forEach(ci => {
                                if (ci.required) {
                                    col.getLabel().removeStyleClass("requiredField");
                                }
                            })
                    })
                }
            },

            setControlEditMode(pType, pEditable) {
                if (pType == "header") {
                    // Header
                    this.byId("btnCreateHeader").setVisible(!pEditable);
                    this.byId("btnEditHeader").setVisible(!pEditable);
                    this.byId("btnCloseHeader").setVisible(!pEditable);
                    this.byId("btnSaveHeader").setVisible(pEditable);
                    this.byId("btnCancelHeader").setVisible(pEditable);

                    this.setReqField("header", pEditable);
                    this.getView().getModel("ui").setProperty("/editModeHeader", pEditable);

                    // Detail
                    this.byId("btnCreateDetail").setEnabled(!pEditable);
                    this.byId("btnEditDetail").setEnabled(!pEditable);
                    this.byId("btnDeleteDetail").setEnabled(!pEditable);
                } else if (pType == "detail") {
                    // Header
                    this.byId("btnCreateHeader").setEnabled(!pEditable);
                    this.byId("btnEditHeader").setEnabled(!pEditable);
                    this.byId("btnCloseHeader").setEnabled(!pEditable);

                    // Detail
                    this.byId("btnCreateDetail").setVisible(!pEditable);
                    this.byId("btnEditDetail").setVisible(!pEditable);
                    this.byId("btnDeleteDetail").setVisible(!pEditable);
                    this.byId("btnAddRowDetail").setVisible(pEditable);
                    this.byId("btnRemoveRowDetail").setVisible(pEditable);
                    this.byId("btnSaveDetail").setVisible(pEditable);
                    this.byId("btnCancelDetail").setVisible(pEditable);

                    this.setReqField("detail", pEditable);
                    if (!pEditable) this.setRowReadMode("detail");
                } else {
                    if (pType == "remarks") {

                        this.byId("btnCreateRemarks").setVisible(!pEditable);
                        this.byId("btnEditRemarks").setVisible(!pEditable);
                        this.byId("btnDeleteRemarks").setVisible(!pEditable);
                        this.byId("btnAddRowRemarks").setVisible(pEditable);
                        this.byId("btnRemoveRowRemarks").setVisible(pEditable);
                        this.byId("btnSaveRemarks").setVisible(pEditable);
                        this.byId("btnCancelRemarks").setVisible(pEditable);

                    } else if (pType == "packInstruct") {

                        this.byId("btnCreatePackInstruct").setVisible(!pEditable);
                        this.byId("btnEditPackInstruct").setVisible(!pEditable);
                        this.byId("btnDeletePackInstruct").setVisible(!pEditable);
                        this.byId("btnAddRowPackInstruct").setVisible(pEditable);
                        this.byId("btnRemoveRowPackInstruct").setVisible(pEditable);
                        this.byId("btnSavePackInstruct").setVisible(pEditable);
                        this.byId("btnCancelPackInstruct").setVisible(pEditable);

                    }

                    // Remarks and Packing Instructions
                    this.setReqField(pType, pEditable);
                    if (!pEditable) this.setRowReadMode(pType);

                    // Icon Tab Bar
                    var oIconTabBar = this.byId("itbHeaderText");
                    if (pEditable) {
                        oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                            .forEach(item => item.setProperty("enabled", false));
                    } else {
                        oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));
                    }
                }

                // Icon Tab Bar
                var oIconTabBar = this.byId("itbHeader");
                if (pEditable) {
                    oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                        .forEach(item => item.setProperty("enabled", false));
                } else {
                    oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));
                }
            },

            showLoadingDialog(arg) {
                if (!_this._LoadingDialog) {
                    _this._LoadingDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.LoadingDialog", _this);
                    _this.getView().addDependent(_this._LoadingDialog);
                } 
                
                _this._LoadingDialog.setTitle(arg);
                _this._LoadingDialog.open();
            },

            closeLoadingDialog() {
                _this._LoadingDialog.close();
            },

            onFirstVisibleRowChanged: function (oEvent) {
                var oTable = oEvent.getSource();
                var sModel;

                if (oTable.getId().indexOf("detailTab") >= 0) {
                    sModel = "detail";
                }
                else if (oTable.getId().indexOf("remarksTab") >= 0) {
                    sModel = "remarks";
                }
                else if (oTable.getId().indexOf("packInstructTab") >= 0) {
                    sModel = "packInstruct";
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

            onFilter: function(oEvent) {
                var oTable = oEvent.getSource();
                var sModel;

                if (oTable.getId().indexOf("detailTab") >= 0) {
                    sModel = "detail";
                }
                else if (oTable.getId().indexOf("remarksTab") >= 0) {
                    sModel = "remarks";
                }
                else if (oTable.getId().indexOf("packInstructTab") >= 0) {
                    sModel = "packInstruct";
                }

                this.setActiveRowHighlight(sModel);
            },

            onColumnUpdated: function (oEvent) {
                var oTable = oEvent.getSource();
                var sModel;

                if (oTable.getId().indexOf("detailTab") >= 0) {
                    sModel = "detail";
                }
                else if (oTable.getId().indexOf("remarksTab") >= 0) {
                    sModel = "remarks";
                }
                else if (oTable.getId().indexOf("packInstructTab") >= 0) {
                    sModel = "packInstruct";
                }

                this.setActiveRowHighlight(sModel);
            },

            setActiveRowHighlight(arg) {
                var oTable = this.byId(arg + "Tab");
                
                setTimeout(() => {
                    var iActiveRowIndex = oTable.getModel(arg).getData().results.findIndex(item => item.ACTIVE === "X");

                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext(arg) && +row.getBindingContext(arg).sPath.replace("/results/", "") === iActiveRowIndex) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow");
                    })
                }, 1);
            },

            onCellClick: function(oEvent) {
                if (oEvent.getParameters().rowBindingContext) {
                    var oTable = oEvent.getSource(); //this.byId("ioMatListTab");
                    var sRowPath = oEvent.getParameters().rowBindingContext.sPath;
                    var sModel;

                    if (oTable.getId().indexOf("detailTab") >= 0) {
                        sModel = "detail";
                    }
                    else if (oTable.getId().indexOf("remarksTab") >= 0) {
                        sModel = "remarks";
                    }
                    else if (oTable.getId().indexOf("packInstructTab") >= 0) {
                        sModel = "packInstruct";
                    }
    
                    oTable.getModel(sModel).getData().results.forEach(row => row.ACTIVE = "");
                    oTable.getModel(sModel).setProperty(sRowPath + "/ACTIVE", "X"); 
                    
                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext(sModel) && row.getBindingContext(sModel).sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow");
                    })
                }
            },

            getCaption() {
                var oJSONModel = new JSONModel();
                var oDDTextParam = [];
                var oDDTextResult = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

                // Label
                oDDTextParam.push({CODE: "PONO"});
                oDDTextParam.push({CODE: "PODATE"});
                oDDTextParam.push({CODE: "DOCTYPE"});
                oDDTextParam.push({CODE: "PURCHORG"});
                oDDTextParam.push({CODE: "VENDOR"});
                oDDTextParam.push({CODE: "PURCHGRP"});
                oDDTextParam.push({CODE: "COMPANY"});
                oDDTextParam.push({CODE: "PURCHPLANT"});
                oDDTextParam.push({CODE: "SHIPTOPLANT"});
                oDDTextParam.push({CODE: "INCOTERMS"});
                oDDTextParam.push({CODE: "CURRENCYCD"});
                oDDTextParam.push({CODE: "PAYTERMS"});
                oDDTextParam.push({CODE: "DESTINATION"});
                oDDTextParam.push({CODE: "SHIPMODE"});
                oDDTextParam.push({CODE: "PACKINSTRUCT"});

                // MessageBox
                oDDTextParam.push({CODE: "INFO_NO_SELECTED"});
                oDDTextParam.push({CODE: "CONFIRM_DISREGARD_CHANGE"});
                oDDTextParam.push({CODE: "INFO_NO_DATA_EDIT"});
                oDDTextParam.push({CODE: "INFO_INVALID_SAVE"});
                oDDTextParam.push({CODE: "WARN_MR_NOT_NEGATIVE"});
                oDDTextParam.push({CODE: "WARN_NO_DATA_MODIFIED"});
                oDDTextParam.push({CODE: "INFO_SEL_ONE_COL"});
                oDDTextParam.push({CODE: "INFO_LAYOUT_SAVE"});
                oDDTextParam.push({CODE: "INFO_NO_DATA_EXEC"});
                oDDTextParam.push({CODE: "INFO_EXECUTE_SUCCESS"});
                oDDTextParam.push({CODE: "INFO_EXECUTE_FAIL"});
                oDDTextParam.push({CODE: "CONFIRM_PROCEED_EXECUTE"});
                oDDTextParam.push({CODE: "CONFIRM_PROCEED_CLOSE"});
                
                oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                    method: "POST",
                    success: function(oData, oResponse) {
                        console.log("getCaption", oData.CaptionMsgItems.results)
                        oData.CaptionMsgItems.results.forEach(item => {
                            oDDTextResult[item.CODE] = item.TEXT;
                        })

                        oJSONModel.setData(oDDTextResult);
                        _this.getView().setModel(oJSONModel, "ddtext");

                        _oCaption = _this.getView().getModel("ddtext").getData();
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(err);
                        _this.closeLoadingDialog();
                    }
                });
            }
        });
    });