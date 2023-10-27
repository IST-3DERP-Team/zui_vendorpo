sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast",
    "../js/TableValueHelp",
    "../js/Common",
],

function (Controller, JSONModel, MessageBox, History, MessageToast, TableValueHelp, Common) {
    var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
    var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });
    
    return Controller.extend("zuivendorpo.controller.splitpo", {

        onInit: function() {
            const route = this.getOwnerComponent().getRouter().getRoute("RouteSplitPO");
            route.attachPatternMatched(this.onPatternMatched, this);
            
            var me = this;

            if (sap.ui.getCore().byId("backBtn") !== undefined) {
                sap.ui.getCore().byId("backBtn").mEventRegistry.press[0].fFunction = function(oEvent) {
                    me.onNavBack();
                }
            }

            this._tableValueHelp = TableValueHelp; 

            var oTableEventDelegate = {
                // onkeyup: function (oEvent) {
                //     me.onKeyUp(oEvent);
                // },

                // onAfterRendering: function (oEvent) {
                //     var oControl = oEvent.srcControl;
                //     var sTabId = oControl.sId.split("--")[oControl.sId.split("--").length - 1];

                //     if (sTabId.substr(sTabId.length - 3) === "Tab") me._tableRendered = sTabId;
                //     else me._tableRendered = "";

                //     me.onAfterTableRendering();
                // },

                onclick: function(oEvent) {
                    me.onTableClick(oEvent);
                }
            };

            this.byId("VPOSplitDtlTab").addEventDelegate(oTableEventDelegate);
        },
        
        onPatternMatched: async function() {  
            var me = this;
            this._oModel = this.getOwnerComponent().getModel();
            this._oModelColumns = [];
            this._resMessage = "";
            this._sActiveTable = "";
            this._headerTextDialog = false;
            this._changeDateDialog = false;
            this._isInfoRecRetrieve = false;
            this._aDataBeforeChange = [];
            this._validationErrors = []
            this._sDataMode = "READ";
            this._sbu = this.getOwnerComponent().getModel("UI_MODEL").getData().sbu;
            this._selValueHelpIndex = "";
            
            if (sap.ui.getCore().byId("backBtn") !== undefined) {
                sap.ui.getCore().byId("backBtn").mEventRegistry.press[0].fFunction = function(oEvent) {
                    me.onNavBack();
                }
            }

            // if (this.getView().getModel("payterms") !== undefined) this.getView().getModel("payterms").destroy();
            // if (this.getView().getModel("header") !== undefined) this.getView().getModel("header").destroy();
            // if (this.getView().getModel("detail") !== undefined) this.getView().getModel("detail").destroy();
            // if (this.getView().getModel("remarks") !== undefined) this.getView().getModel("remarks").destroy();
            // if (this.getView().getModel("packins") !== undefined) this.getView().getModel("packins").destroy();
            // if (this.getView().getModel("fabspecs") !== undefined) this.getView().getModel("fabspecs").destroy();
            // if (this.getView().getModel("potol") !== undefined) this.getView().getModel("potol").destroy();

            this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("LOOKUP_MODEL").getData().shipmode), "shipmode");
            this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("LOOKUP_MODEL").getData().incoterms), "incoterms");
            this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("LOOKUP_MODEL").getData().uom), "uom");
            this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("LOOKUP_MODEL").getData().payterms), "payterms");
            this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("LOOKUP_MODEL").getData().purchorg), "purchorg");
            this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("LOOKUP_MODEL").getData().purchgrp), "purchgrp");
            this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("LOOKUP_MODEL").getData().podoctypeinfo), "podoctypeinfo");
            this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("LOOKUP_MODEL").getData().vendor), "vendor");
            this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("LOOKUP_MODEL").getData().custgrp), "custgrp");
            this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("LOOKUP_MODEL").getData().inforecchk), "inforecchk");
            this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("LOOKUP_MODEL").getData().company), "company");
            this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("LOOKUP_MODEL").getData().currency), "currency");
            this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("LOOKUP_MODEL").getData().podoctype), "podoctype");
            this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("LOOKUP_MODEL").getData().purchplant), "purchplant");
            this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("LOOKUP_MODEL").getData().shiptoplant), "shiptoplant");
            this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("LOOKUP_MODEL").getData().supplytype), "supplytype");
            this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("LOOKUP_MODEL").getData().plant), "plant");

            this._oData = {
                header: jQuery.extend(true, {}, this.getOwnerComponent().getModel("SPLITPO_MODEL").getData().header),
                detail: jQuery.extend(true, [], this.getOwnerComponent().getModel("SPLITPO_MODEL").getData().detail)
            }
            console.log(this._oData)
            var oHeaderData = this.getOwnerComponent().getModel("SPLITPO_MODEL").getData().header;            
            var oDetailData = this.getOwnerComponent().getModel("SPLITPO_MODEL").getData().detail; //.filter(fItem => fItem.DELETED === false && fItem.DELCOMPLETE === false);
            var aDataRemarks = [], aDataPackIns = [], aDataFabSpecs = []; //, aDataPOTolerance = [];

            oHeaderData.PODT = dateFormat.format(new Date());
            oHeaderData.VENDOR = "";
            oHeaderData.PURCHORG = "";
            oHeaderData.PAYMNTTERMS = "";
            oHeaderData.INCOTERMS = "";
            oHeaderData.DEST = "";
            oHeaderData.SHIPMODE = "";

            this.getView().setModel(new JSONModel(oHeaderData), "VPOSplitHdr");
            this.getView().setModel(new JSONModel(oDetailData), "VPOSplitDtl");
            
            this.getView().setModel(new JSONModel({
                today: dateFormat.format(new Date()),
                infnr: oDetailData[0].PURCHINFOREC
            }), "ui");

            this._poNO = "";
            this._bFabSpecsChanged = false;
            this._bRemarksChanged = false;
            this._bPackInsChanged = false;
            this._bHeaderChanged = false;
            this._bDetailsChanged = false;
            this._aRemarksDataBeforeChange = [];
            this._aPackInsDataBeforeChange = [];
            this._aFabSpecsDataBeforeChange = [];
            this._aHeaderDataBeforeChange = [];
            this._aDetailsDataBeforeChange = [];
            this._validationErrors = [];
            this._aCreatePOResult = [];
            this._oParamCPOTolData = [];
            this._oDataPOTolerance = {
                WEMNG: "0",
                FOCQTY: "0",
                TOLALLOWEDIT: "",
                QTYMIN: "0",
                QTYMAX: "0",
                UNTTOMIN: "0",
                UNTTOMAX: "0",
                UEBTOMIN: "0",
                UEBTOMAX: "0"
            };

            this.getColumnProp();

            this.getOwnerComponent().getModel("UI_MODEL").setProperty("/refresh", false);
            this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("CAPTION_MSGS_MODEL").getData().text), "ddtext");
            
            if (this.getOwnerComponent().getModel("LOOKUP_MODEL").getData().relstrat !== undefined) {
                this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("LOOKUP_MODEL").getData().relstrat), "relstrat");
            }
            else {
                var oRelStartData = {
                    RELGRP: "",
                    RELSTRAT: ""
                }

                this.getView().setModel(new JSONModel(oRelStartData), "relstrat");
            }

            aDataRemarks.push({
                ITEM: "1",
                REMARKS: "",
                STATUS: ""
            });

            aDataPackIns.push({
                ITEM: "1",
                PACKINS: "",
                STATUS: "" 
            })

            aDataFabSpecs.push({
                EBELN: "",
                EBELP: "00010",
                ZZMAKT: "",
                ZZHAFE: "",
                ZZSHNK: "",
                ZZCHNG: "",
                ZZSTAN: "",
                ZZDRY: "",
                ZZCFWA: "",
                ZZCFCW: "",
                ZZSHRQ: "",
                ZZSHDA: "",
                PLANMONTH: oDetailData[0].PLANMONTH, 
                ZZREQ1: "",
                ZZREQ2: "",
                STATUS: "NEW" 
            });

            this.getView().setModel(new JSONModel(aDataRemarks), "remarks");
            this.getView().setModel(new JSONModel(aDataPackIns), "packins");            
            this.getView().setModel(new JSONModel(aDataFabSpecs), "fabspecs");

            this.getDiscRate();
        },

        onNavBack: function(oEvent) {
            var oData = {
                Process: "splitpo-cancel",
                Text: this.getView().getModel("ddtext").getData()["CONF_CANCEL_TRANS"]
            }

            if (!this._ConfirmDialog) {
                this._ConfirmDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.ConfirmDialog", this);

                this._ConfirmDialog.setModel(new JSONModel(oData));
                this.getView().addDependent(this._ConfirmDialog);
            }
            else this._ConfirmDialog.setModel(new JSONModel(oData));
                
            this._ConfirmDialog.open();
        },

        //to add local columns config
        getColumnProp: async function() {
            var sPath = jQuery.sap.getModulePath("zuivendorpo", "/model/columns.json");

            var oModelColumns = new JSONModel();
            await oModelColumns.loadData(sPath);

            // this._aColumns = oModelColumns.getData();
            this._oModelColumns = oModelColumns.getData();
        },

        getResource() {
            var me = this;
            var oHeaderData = this.getView().getModel("VPOSplitHdr").getData();

            var oParam = {
                SBU: oHeaderData.SBU,
                PONO: oHeaderData.PONO,
                N_PurchOrg: [],
                N_PurchGrp: [],
                N_PayTerms: [],
                N_IncoTerms: [],
                N_ShipMode: [],
                N_UOM: [],
                N_DocTypeInfo: [],
                N_CustGrp: [],
                N_Vendor: []
            }

            this._oModel.create("/VPOSplitPOResourceSet", oParam, {
                method: "POST",
                success: function(oData, oResponse) {
                    console.log(oData);
                    me.getView().setModel(new JSONModel(oData.N_PurchOrg.results), "purchorg");
                    me.getView().setModel(new JSONModel(oData.N_PurchGrp.results), "purchgrp");
                    me.getView().setModel(new JSONModel(oData.N_PayTerms.results), "payterms");
                    me.getView().setModel(new JSONModel(oData.N_IncoTerms.results), "incoterms");
                    me.getView().setModel(new JSONModel(oData.N_ShipMode.results), "shipmode");
                    me.getView().setModel(new JSONModel(oData.N_UOM.results), "uom");
                    me.getView().setModel(new JSONModel(oData.N_DocTypeInfo.results), "podoctypeinfo");
                    me.getView().setModel(new JSONModel(oData.N_CustGrp.results), "custgrp");
                    me.getView().setModel(new JSONModel(oData.N_Vendor.results), "vendor");
                    me.getView().setModel(new JSONModel(oData.N_InfoRecChk.results), "inforecchk");

                    me.getDiscRate();
                },
                error: function (err) { }
            });

            // this._oModel.read("/VPOManualPurchOrgRscSet", {
            //     success: function (oData, oResponse) {
            //         me.getView().setModel(new JSONModel(oData.results), "purchorg");
            //         // me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/incoterm", oData.results);
            //     },
            //     error: function (err) { }
            // }); 

            // this._oModel.read("/VPOManualPurchGrpRscSet", {
            //     urlParameters: {
            //         "$filter": "SBU eq '" + oHeaderData.SBU + "'"
            //     },
            //     success: function (oData, oResponse) {
            //         me.getView().setModel(new JSONModel(oData.results), "purchgrp");
            //         // me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/incoterm", oData.results);
            //     },
            //     error: function (err) { }
            // }); 

            // this._oModel.read("/VPOSplitPayTermsRscSet", {
            //     success: function (oData, oResponse) {
            //         me.getView().setModel(new JSONModel(oData.results), "payterms");
            //         // me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/incoterm", oData.results);
            //     },
            //     error: function (err) { }
            // });

            // this._oModel.read("/VPOManualIncoRscSet", {
            //     success: function (oData, oResponse) {
            //         me.getView().setModel(new JSONModel(oData.results), "incoterms");
            //         // me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/incoterm", oData.results);
            //     },
            //     error: function (err) { }
            // }); 

            // this._oModel.read("/VPOManualShipModeRscSet", {
            //     urlParameters: {
            //         "$filter": "SBU eq '" + oHeaderData.SBU + "'"
            //     },
            //     success: function (oData, oResponse) {
            //         me.getView().setModel(new JSONModel(oData.results), "shipmode");
            //         // me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/incoterm", oData.results);
            //     },
            //     error: function (err) { }
            // });

            // this._oModel.read("/VPOSplitVendorRscSet", {
            //     urlParameters: {
            //         "$filter": "REQPLANTCD eq '" + oHeaderData.SHIPTOPLANT + "' and EKORG eq '" + oHeaderData.PURCHORG + "' and LIFNR eq '" + oHeaderData.VENDOR + "'"
            //     },
            //     success: function (oData, oResponse) {
            //         me.getView().setModel(new JSONModel(oData.results), "vendor");
            //         // me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/incoterm", oData.results);
            //     },
            //     error: function (err) { }
            // });

            // this._oModel.read("/VPOUomSet", {
            //     success: function (oData, oResponse) {
            //         me.getView().setModel(new JSONModel(oData.results), "uom");
            //         // me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/incoterm", oData.results);
            //     },
            //     error: function (err) { }
            // });

            // this._oModel.read("/VPODocTypInfoSet", {
            //     urlParameters: {
            //         "$filter": "Podoctyp eq '" + oHeaderData.DOCTYPE + "'"
            //     },
            //     success: function (oData, oResponse) {
            //         console.log(oData.results)
            //         me.getView().setModel(new JSONModel(oData.results), "podoctypeinfo");
            //     },
            //     error: function (err) { }
            // });

            // this._oModel.read("/VPOSplitCustGrpSet", {
            //     urlParameters: {
            //         "$filter": "PRNO eq '" + oDetailData[0].PRNO + "' and PRLN eq '" + oDetailData[0].PRITM + "'"
            //     },
            //     success: function (oData, oResponse) {
            //         me.getView().setModel(new JSONModel(oData.results), "custgrp");
            //         me.getDiscRate();
            //     },
            //     error: function (err) { }
            // });
        },

        getDiscRate() {
            var me = this;
            var oHeaderData = this.getView().getModel("VPOSplitHdr").getData();
            var oModelRFC = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
            var oParam = {};
            var vCustGrp = "";

            if (this.getView().getModel("custgrp").getData().length > 0) {
                vCustGrp = this.getView().getModel("custgrp").getData()[0].CUSTGRP;
            }

            oParam["N_GetDiscRateParam"] = [{
                ConditionType: "RL01",
                PurchasingOrg: oHeaderData.PURCHORG,
                Vendor: oHeaderData.VENDOR,
                CustomerGroup: vCustGrp,
                Forwhatdate: sapDateFormat.format(new Date())
            }]

            oParam["N_GetDiscRateReturn"] = [];

            oModelRFC.create("/GetDiscRateSet", oParam, {
                method: "POST",
                success: function(oData, oResponse) {
                    me.getView().setModel(new JSONModel(oData["N_GetDiscRateReturn"].results), "discrates");
                },
                error: function (err) { }
            });
        },

        getInfoRecord: async (me) => {
            var oParamData = [];
            var oHeaderData = me.getView().getModel("VPOSplitHdr").getData();

            var oParam = {
                VENDOR: oHeaderData.VENDOR,
                PURCHORG: oHeaderData.PURCHORG,
                PURCHGRP: oHeaderData.PURCHGRP,
                PURCHPLANT: oHeaderData.PURCHPLANT,
                PODT: sapDateFormat.format(new Date(oHeaderData.PODT))
            };

            me.getView().getModel("VPOSplitDtl").getData().forEach(item => {
                if (me.getView().getModel("inforecchk").getData().filter(fItem => fItem.FIELD2 === item.MATTYP).length > 0) {
                    oParamData.push({
                        MATNO: item.MATNO,
                        INFOREC: "",
                        SRCLIST: "X",
                        EXIST: ""
                    })                    
                }
                else {
                    oParamData.push({
                        MATNO: item.MATNO,
                        INFOREC: "X",
                        SRCLIST: "",
                        EXIST: ""
                    })
                }
            })

            oParam["N_InfoRecSrcLstItem"] = oParamData;
            oParam["N_InfoRecord"] = [];
            oParam["N_SourceList"] = [];

            var oPromise = new Promise((resolve, reject) => {
                me._oModel.create("/VPOInfoRecSrcLstSet", oParam, {
                    method: "POST",
                    success: function(oResult, oResponse) {
                        var oData = [];
                        var noSourceList = oResult.N_InfoRecSrcLstItem.results.filter(fItem => fItem.SRCLIST === "X" && fItem.EXIST === "");
                        
                        if (noSourceList.length > 0) {
                            noSourceList.forEach(item => {
                                oData.push({
                                    MATNO: item.MATNO,
                                    REMARKS: "No source list found."
                                })
                            })
                        }

                        oResult.N_InfoRecSrcLstItem.results.filter(fItem => fItem.INFOREC === "X").forEach(item => {
                            var infoRec = oResult.N_InfoRecord.results.filter(fItem => fItem.Vendor === oResult.VENDOR && fItem.Material === item.MATNO && fItem.PurchOrg === oResult.PURCHORG);

                            if (infoRec.length > 0) {
                                if (infoRec[0].RetType === "E") {
                                    oData.push({
                                        MATNO: item.MATNO,
                                        REMARKS: infoRec[0].RetMessage
                                    })
                                }
                                else {
                                    var oItem = me.getView().getModel("VPOSplitDtl").getData().filter(fItem => fItem.MATNO === item.MATNO);

                                    if (oItem.length > 0) {
                                        oItem[0].NETPRICE = infoRec[0].NetPrice;
                                        oItem[0].PER = infoRec[0].PriceUnit;
                                        oItem[0].ORDERPRICEUOM = infoRec[0].PoUnit;
                                        oItem[0].NUMERATOR = infoRec[0].ConvNum1;
                                        oItem[0].DENOMINATOR = infoRec[0].ConvDen1;
                                        oItem[0].TAXCD = infoRec[0].TaxCode;
                                        oItem[0].UNLIMITED = infoRec[0].Unlimited;
                                        oItem[0].OVERDELTOL = infoRec[0].Overdeltol;
                                        oItem[0].UNDERDELTOL = infoRec[0].UnderTol;
                                        oItem[0].GRBASEDIVIND = infoRec[0].Grbasediv;
                                    }
                                }
                            }
                            else {
                                oData.push({
                                    MATNO: item.MATNO,
                                    REMARKS: "No info record found."
                                })
                            }
                        })

                        if (oData.length === 0) {
                            me._isInfoRecRetrieve = true;
                            resolve(true);
                        }
                        else {
                            resolve(false);

                            var vRowCount = oData.length > 7 ? oData : 7;

                            if (!me._InfoRecordResultDialog) {
                                me._InfoRecordResultDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.InfoRecordResultDialog", me);

                                me._InfoRecordResultDialog.setModel(
                                    new JSONModel({
                                        items: oData,
                                        ddtext: {
                                            MATNO: me.getView().getModel("ddtext").getData()["MATNO"],
                                            REMARKS: me.getView().getModel("ddtext").getData()["REMARKS"],
                                        },
                                        rowCount: vRowCount
                                    })
                                )

                                me.getView().addDependent(this._InfoRecordResultDialog);
                            }
                            else {
                                me._InfoRecordResultDialog.getModel().setProperty("/items", oData);
                                me._InfoRecordResultDialog.getModel().setProperty("/rowCount", vRowCount);
                            }

                            me._InfoRecordResultDialog.setTitle("");
                            me._InfoRecordResultDialog.open();
                        }
                    },
                    error: function(err) {
                        MessageBox.err(err.message);
                        resolve(false);
                        // Common.closeProcessingDialog(me);
                    }
                }); 
            })

            return await oPromise;
        },

        setRowEditMode() {
            var me = this;
            var oTable = this.byId("VPOSplitDtlTab"); 
            var vINFNR = this.getView().getModel("VPOSplitDtl").getData()[0].PURCHINFOREC;
            var vVisible = true;

            var oInputEventDelegate = {
                onkeydown: function(oEvent){
                    me.onInputKeyDown(oEvent);
                },
            };

            oTable.getColumns().forEach((col, idx) => {
                var sColName = "";

                if (col.mAggregations.template.mBindingInfos.text !== undefined) {
                    sColName = col.mAggregations.template.mBindingInfos.text.parts[0].path;
                }
                else if (col.mAggregations.template.mBindingInfos.selected !== undefined) {
                    sColName = col.mAggregations.template.mBindingInfos.selected.parts[0].path;
                }

                this._oModelColumns["VPOSplitDtl"].filter(item => item.ColumnName === sColName)
                    .forEach(ci => {
                        if ((sColName === "OVERDELTOL" || sColName === "UNDERDELTOL")  && vINFNR !== "") {
                            vVisible = false;
                        }

                        if (ci.type === "NUMBER") {
                            col.setTemplate(new sap.m.Input({
                                type: sap.m.InputType.Number,
                                textAlign: sap.ui.core.TextAlign.Right,
                                value: "{path:'VPOSplitDtl>" + sColName + "', formatOptions:{ minFractionDigits:" + ci.length + ", maxFractionDigits:" + ci.length + " }, constraints:{ precision:" + ci.decimal + ", scale:" + ci.length + " }}",
                                liveChange: this.onNumberLiveChange.bind(this), 
                                change: this.onNumberChange.bind(this),
                                enabled: true,
                                visible: vVisible
                            }).addEventDelegate(oInputEventDelegate));
                        }
                        else if (ci.type === "BOOLEAN") {
                            col.setTemplate(new sap.m.CheckBox({
                                selected: "{VPOSplitDtl>" + sColName + "}", 
                                editable: true,
                                visible: vVisible,
                                select: this.onCheckBoxLiveChange.bind(this)
                            }));
                        }
                        else if (ci.type === "STRING")  {
                            col.setTemplate(new sap.m.Input({
                                value: "{VPOSplitDtl>" + sColName + "}",
                                maxLength: +ci.length,
                                change: this.onInputLiveChange.bind(this)
                            }).addEventDelegate(oInputEventDelegate));
                        }

                        if (ci.required) {
                            col.getLabel().addStyleClass("sapMLabelRequired");
                        }
                    }) 
            })

            setTimeout(() => {
                var iNPCellIndex = -1, iPerCellIndex = -1;

                oTable.getRows()[0].getCells().forEach((cell, idx) => {
                    if (cell.getBindingInfo("value") !== undefined) {
                        if (cell.getBindingInfo("value").parts[0].path === "NETPRICE") iNPCellIndex = idx;
                        else if (cell.getBindingInfo("value").parts[0].path === "PER") iPerCellIndex = idx;
                    }
                })

                this.getView().getModel("VPOSplitDtl").getData().forEach((item, index) => {
                    if (me.getView().getModel("inforecchk").getData().filter(fItem => fItem.FIELD2 === item.MATTYP).length > 0) {
                        oTable.getRows()[index].getCells()[iNPCellIndex].setProperty("enabled", true); 
                        oTable.getRows()[index].getCells()[iPerCellIndex].setProperty("enabled", true); 
                    }
                    else { 
                        oTable.getRows()[index].getCells()[iNPCellIndex].setProperty("enabled", false); 
                        oTable.getRows()[index].getCells()[iPerCellIndex].setProperty("enabled", false); 
                    }                   
                })
            }, 500);
        },

        setRowReadMode() {
            var oTable = this.byId("VPOSplitDtlTab");           

            oTable.getColumns().forEach((col, idx) => {
                var sColName = "";

                if (col.mAggregations.template.mBindingInfos.text !== undefined) {
                    sColName = col.mAggregations.template.mBindingInfos.text.parts[0].path;
                }
                else if (col.mAggregations.template.mBindingInfos.selected !== undefined) {
                    sColName = col.mAggregations.template.mBindingInfos.selected.parts[0].path;
                }
                else if (col.mAggregations.template.mBindingInfos.value !== undefined) {
                    sColName = col.mAggregations.template.mBindingInfos.value.parts[0].path;
                }

                this._oModelColumns["VPOSplitDtl"].filter(item => item.ColumnName === sColName)
                    .forEach(ci => {
                        if (ci.type === "BOOLEAN") {
                            col.setTemplate(new sap.m.CheckBox({
                                selected: "{VPOSplitDtl>" + sColName + "}", 
                                editable: false}
                            ));
                        }
                        else {
                            col.setTemplate(new sap.m.Text({
                                text: "{VPOSplitDtl>" + sColName + "}"
                            }));
                        }

                        if (ci.required) {
                            col.getLabel().removeStyleClass("sapMLabelRequired");
                        }
                    }) 
            })
        },

        onEdit: function(oEvent) {
            this._sActiveTable = oEvent.getSource().data("TableId");
            this.editData();
        },

        editData() {
            if (this._sDataMode === "READ") {
                this._validationErrors = [];
                this._aDataBeforeChange = jQuery.extend(true, [], this.getView().getModel("VPOSplitDtl").getData());
    
                this.setRowEditMode();
    
                this.byId("btnEditSplitPODtl").setVisible(false);
                this.byId("btnSaveSplitPODtl").setVisible(true);
                this.byId("btnCancelSplitPODtl").setVisible(true);
                this.byId("btnDeleteSplitPODtl").setVisible(false);
                this.byId("btnRefreshSplitPODtl").setVisible(false);
    
                this.byId("btnUpdDateSplitPOHdr").setEnabled(false);
                this.byId("btnHdrTxtSplitPOHdr").setEnabled(false);
                this.byId("btnGenPOSplitPOHdr").setEnabled(false);
                this.byId("btnCancelPOSplitPOHdr").setEnabled(false);
    
                this._sDataMode = "EDIT";
            }
        },

        onCancel: function(oEvent) {
            this._sActiveTable = oEvent.getSource().data("TableId");
            this.cancelData();  
        },

        cancelData() {
            if (this._sDataMode === "EDIT") {
                if (this.getView().getModel("VPOSplitDtl").getData().filter(fItem => fItem.EDITED === true).length > 0) {
                    var oData = {
                        Process: "details-cancel",
                        Text: this.getView().getModel("ddtext").getData()["CONF_DISCARD_CHANGE"]
                    }
    
                    if (!this._ConfirmDialog) {
                        this._ConfirmDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.ConfirmDialog", this);
    
                        this._ConfirmDialog.setModel(new JSONModel(oData));
                        this.getView().addDependent(this._ConfirmDialog);
                    }
                    else this._ConfirmDialog.setModel(new JSONModel(oData));
                        
                    this._ConfirmDialog.open();
                }
                else {
                    this.setRowReadMode();
    
                    this.byId("btnEditSplitPODtl").setVisible(true);
                    this.byId("btnSaveSplitPODtl").setVisible(false);
                    this.byId("btnCancelSplitPODtl").setVisible(false);
                    this.byId("btnDeleteSplitPODtl").setVisible(true);
                    this.byId("btnRefreshSplitPODtl").setVisible(true);
        
                    this.byId("btnUpdDateSplitPOHdr").setEnabled(true);
                    this.byId("btnHdrTxtSplitPOHdr").setEnabled(true);
                    this.byId("btnGenPOSplitPOHdr").setEnabled(true);
                    this.byId("btnCancelPOSplitPOHdr").setEnabled(true);
    
                    this._sDataMode = "READ";
        
                    this.getView().getModel("VPOSplitDtl").setProperty("/", this._aDataBeforeChange);   
                }
            }
        },

        onSave: function(oEvent) {
            this._sActiveTable = oEvent.getSource().data("TableId");
            this.saveData();  
        },

        async saveData() {
            if (this._sDataMode === "EDIT") {
                var me = this;
                var bProceed = true;

                if (this._validationErrors.length > 0) {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_CHECK_INVALID_ENTRIES"]);
                    return;
                }

                this._oModelColumns["VPOSplitDtl"].filter(fItem => fItem.required === true).forEach(item => {
                    this.getView().getModel("VPOSplitDtl").getData().forEach(val => {
                        console.log(val[item.ColumnName]);
                        if (val[item.ColumnName] === "") {
                            bProceed = false;
                        }
                    })
                })

                if (!bProceed) {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_INPUT_REQD_FIELDS"]);
                    return;
                }

                this.getView().getModel("VPOSplitDtl").getData().forEach(item => {
                    if (+item.SPLITPOQTY > +item.POQTY || item.SPLITPOQTY === "0") {
                        bProceed = false;
                    }
                })

                if (!bProceed) {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["ERR_INVALID_SPLITPOQTY"]);
                    return;
                }

                Common.openProcessingDialog(this);
                // bProceed = await this.getInfoRecord(this);

                // if (!bProceed) {
                //     Common.closeProcessingDialog(this);
                //     return;
                // }
                this._isInfoRecRetrieve = true;

                MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"], {
                    onClose: function(oAction) { }
                })

                me.setRowReadMode();

                me.byId("btnEditSplitPODtl").setVisible(true);
                me.byId("btnSaveSplitPODtl").setVisible(false);
                me.byId("btnCancelSplitPODtl").setVisible(false);
                me.byId("btnDeleteSplitPODtl").setVisible(true);
                me.byId("btnRefreshSplitPODtl").setVisible(true);
    
                me.byId("btnUpdDateSplitPOHdr").setEnabled(true);
                me.byId("btnHdrTxtSplitPOHdr").setEnabled(true);
                me.byId("btnGenPOSplitPOHdr").setEnabled(true);
                me.byId("btnCancelPOSplitPOHdr").setEnabled(true);

                me._sDataMode = "READ";

                this.getView().getModel("VPOSplitDtl").getData().forEach(item => item.EDITED = false);
                Common.closeProcessingDialog(this);
            }
        },

        onDelete: function(oEvent) {
            this._sActiveTable = oEvent.getSource().data("TableId");
            this.deleteData();
        },

        deleteData() {
            if (this._sDataMode === "READ") {
                var oTable = this.byId(this._sActiveTable);
                var me = this;

                if (this.getView().getModel(this._sActiveTable.replace("Tab", "")).getData().length === 0) {
                    MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_NO_RECORD_TO_DELETE"]);
                    return;
                }
                
                var aData = this.getView().getModel(this._sActiveTable.replace("Tab", "")).getData();
                var aSelIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                
                if (aSelIndices.length > 0) {
                    MessageBox.confirm(me.getView().getModel("ddtext").getData()["CONF_DELETE_RECORDS"], {
                        actions: [me.getView().getModel("ddtext").getData()["YES"], me.getView().getModel("ddtext").getData()["NO"]],
                        onClose: function (sAction) {
                            if (sAction === me.getView().getModel("ddtext").getData()["YES"]) {
                                Common.openProcessingDialog(me);
    
                                aSelIndices.forEach(item => {
                                    oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                                })
    
                                aSelIndices = oTmpSelectedIndices;                                

                                aData = aData.filter(function (value, index) {
                                    return aSelIndices.indexOf(index) === -1;
                                })

                                oTable.clearSelection();

                                me.getView().getModel(me._sActiveTable.replace("Tab", "")).setProperty("/",  aData);
                                Common.closeProcessingDialog(me);
                            }
                        }
                    });
                } 
                else  {
                    MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_SEL_RECORD_TO_DELETE"]);
                }
            }
        },

        onInfoRecordClose: function(oEvent) {
            this.setRowReadMode();

            this.byId("btnEditSplitPODtl").setVisible(true);
            this.byId("btnSaveSplitPODtl").setVisible(false);
            this.byId("btnCancelSplitPODtl").setVisible(false);
            this.byId("btnDeleteSplitPODtl").setVisible(true);
            this.byId("btnRefreshSplitPODtl").setVisible(true);

            this.byId("btnUpdDateSplitPOHdr").setEnabled(true);
            this.byId("btnHdrTxtSplitPOHdr").setEnabled(true);
            this.byId("btnGenPOSplitPOHdr").setEnabled(true);
            this.byId("btnCancelPOSplitPOHdr").setEnabled(true);

            this._sDataMode = "READ";

            this.getView().getModel("VPOSplitDtl").setProperty("/", this._aDataBeforeChange);

            this._InfoRecordResultDialog.close();
        },

        handleSuggestionItemSelected: function (oEvent) {
            var oSource = oEvent.getSource();
            var oSelectedItem = oEvent.getParameter("selectedItem");
            // var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
            console.log(oSource);
            console.log(oSelectedItem);

            this._selValueHelpIndex = "-1";
            
            if (oSelectedItem !== null) {
                this._selValueHelpIndex = oSelectedItem.getBindingInfo("key").binding.oContext.sPath.replace("/", "");
            }
        },
       
        onValueHelpInputChange: function(oEvent) {
            if (this._validationErrors === undefined) this._validationErrors = [];

            var oSource = oEvent.getSource();
            var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
            oSource.setValueState(isInvalid ? "Error" : "None");

            // var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
            var sRowPath = "";
            var sModel = oSource.getBindingInfo("value").parts[0].model;

            oSource.getSuggestionItems().forEach(item => {
                if (item.getProperty("key") === oSource.getValue().trim()) {
                    isInvalid = false;
                    oSource.setValueState(isInvalid ? "Error" : "None");
                }
            })

            if (isInvalid) this._validationErrors.push(oEvent.getSource().getId());
            else {
                this._validationErrors.forEach((item, index) => {
                    if (item === oEvent.getSource().getId()) {
                        this._validationErrors.splice(index, 1)
                    }
                })
            }

            if (sModel === "grpheader") {
                this.getView().getModel(sModel).setProperty(oSource.getBindingInfo("value").parts[0].path, oSource.getSelectedKey());
            }
            else {
                sRowPath = oSource.oParent.getBindingContext(sModel).sPath;
                this.getView().getModel(sModel).setProperty(sRowPath + '/' + oSource.getBindingInfo("value").parts[0].path, oSource.getSelectedKey());
            }

            if (oSource.getBindingInfo("value").parts[0].path === "SUPPLYTYPE") {
                var oTable = this.byId(sModel + "Tab");
                var oSupplyType = this.getView().getModel("supplyType").getData().filter(fItem => fItem.SUPPLYTYP === oSource.getSelectedKey());
                var iRowIndex = +sRowPath.split("/")[sRowPath.split("/").length-1];

                if (oSupplyType[0].FOC === "X") {
                    //disable gross/net price, set value to zero                    
                    oTable.getRows()[iRowIndex].getCells()[this._iGPCellIndex].setProperty("enabled", false);

                    this.getView().getModel(sModel).setProperty(sRowPath + '/GROSSPRICE', "0");
                    oTable.getModel(sModel).setProperty(sRowPath + '/GROSSPRICE', "0");
                }
                else {
                    var vMatTyp = this.getView().getModel(sModel).getProperty(sRowPath + '/MATTYP');
                    if (me.getView().getModel("inforecchk").getData().filter(fItem => fItem.FIELD2 === vMatTyp).length > 0) {
                        oTable.getRows()[iRowIndex].getCells()[this._iGPCellIndex].setProperty("enabled", false);
                    }
                    else { oTable.getRows()[iRowIndex].getCells()[this._iGPCellIndex].setProperty("enabled", true); }
                }
            }
            else if (oSource.getBindingInfo("value").parts[0].path === "UOM") {
                var oUOM = this.getView().getModel("uom").getData().filter(fItem => fItem.MSEHI === oSource.getSelectedKey());
                var vOrderUOMANDEC = this.getView().getModel(sModel).getProperty(sRowPath + '/ORDERUOMANDEC');

                if (vOrderUOMANDEC !== oUOM[0].ANDEC) {
                    var vBasePOQty = this.getView().getModel(sModel).getProperty(sRowPath + '/BASEPOQTY');
                    var vBaseConvFactor = this.getView().getModel(sModel).getProperty(sRowPath + '/BASECONVFACTOR');
                    var vOrderConvFactor = this.getView().getModel(sModel).getProperty(sRowPath + '/ORDERCONVFACTOR');
                    var vPer = this.getView().getModel(sModel).getProperty(sRowPath + '/PER');

                    var sOrderConvFactor = vOrderConvFactor === "" || vOrderConvFactor === "0" ? "1" : vOrderConvFactor;
                    var sBaseConvFactor = vBaseConvFactor === "" || vBaseConvFactor === "0" ? "1" : vBaseConvFactor;
                    var sPer = vPer === "" ? "1" : vPer;
                    var vComputedPOQty = +vBasePOQty / ((+sOrderConvFactor) * (+sBaseConvFactor) * (+sPer));
                    var vFinalPOQty = "0";

                    if (oUOM[0].ANDEC === 0) vFinalPOQty = Math.ceil(vComputedPOQty).toString();
                    else vFinalPOQty = vComputedPOQty.toFixed(oUOM[0].ANDEC);

                    this.getView().getModel(sModel).setProperty(sRowPath + '/ORDERUOMANDEC', oUOM[0].ANDEC);
                    this.getView().getModel(sModel).setProperty(sRowPath + '/ORDERPOQTY', vFinalPOQty);
                }                
            }

            this._bHeaderChanged = true;
        },

        onNumberLiveChange: function(oEvent) {
            if (this._validationErrors === undefined) this._validationErrors = [];

            var oSource = oEvent.getSource();
            var sModel = oSource.getBindingInfo("value").parts[0].model;
            var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
            var vDecPlaces = oSource.getBindingInfo("value").constraints.precision;
            var bError = false;
            var vUOM = this.getView().getModel(sModel).getProperty(sRowPath + "/UOM");
            var vOrigPOQty = this.getView().getModel(sModel).getProperty(sRowPath + "/POQTY");

            if (oSource.getBindingInfo("value").parts[0].path === "SPLITPOQTY") {
                vDecPlaces = this.getView().getModel("uom").getData().filter(fItem => fItem.MSEHI === vUOM)[0].ANDEC;
            }
            console.log(+oEvent.getParameters().value)
            console.log(+vOrigPOQty)
            if (oEvent.getParameters().value.split(".").length > 1) {
                if (vDecPlaces === 0) {
                    oEvent.getSource().setValueState("Error");
                    oEvent.getSource().setValueStateText("Value should not have decimal place/s.");
                    this._validationErrors.push(oEvent.getSource().getId());
                    bError = true;
                }
                else {
                    if (oEvent.getParameters().value.split(".")[1].length > vDecPlaces) {
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Enter a number with a maximum decimal places: " + vDecPlaces.toString());
                        this._validationErrors.push(oEvent.getSource().getId());
                        bError = true;
                    }
                    else if (+oEvent.getParameters().value > +vOrigPOQty) {
                        console.log("dumaan dito");
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Split quantity should not exceed original PO quantity.");
                        this._validationErrors.push(oEvent.getSource().getId());
                        bError = true;
                    }
                    else {
                        oEvent.getSource().setValueState("None");
                        this._validationErrors.forEach((item, index) => {
                            if (item === oEvent.getSource().getId()) {
                                this._validationErrors.splice(index, 1)
                            }
                        })
                        bError = false;
                    }
                }
            }
            else {
                oEvent.getSource().setValueState("None");
                this._validationErrors.forEach((item, index) => {
                    if (item === oEvent.getSource().getId()) {
                        this._validationErrors.splice(index, 1)
                    }
                })
                bError = false;
            }

            this.getView().getModel(sModel).setProperty(sRowPath + "/EDITED", true);
        },

        onNumberChange: function(oEvent) {
            var oSource = oEvent.getSource();
            var sModel = oSource.getBindingInfo("value").parts[0].model;
            var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;

            if (oSource.getProperty("valueState") === "None") {
                if (oSource.getBindingInfo("value").parts[0].path === "SPLITPOQTY" && !(oEvent.getParameters().value === "" || oEvent.getParameters().value === "0")) {   
                    var oItem = this.getView().getModel("VPOSplitDtl").getData().filter(fItem => fItem.ITEM === this.getView().getModel(sModel).getProperty(sRowPath + "/ITEM"))[0];
                    oItem.SPLITPOQTY = oEvent.getParameters().value;

                    this.getPOTolerance(sRowPath, oItem);
                }
            }
        },

        onInputLiveChange: function(oEvent) {
            var oSource = oEvent.getSource();
            
            // if (oSource.getProperty("required") !== undefined && oSource.getProperty("required") === true) {
            //     if (oEvent.getParameters().value !== "") {
            //         oSource.setValueState("None");
            //     }
            // }

            var sModel = oSource.getBindingInfo("value").parts[0].model;
            var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
            console.log(oSource)

            this.getView().getModel(sModel).setProperty(sRowPath + "/EDITED", true);
        },

        onCheckBoxLiveChange: function(oEvent) {
            var oSource = oEvent.getSource();
            console.log(oSource)
            var sModel = oSource.getBindingInfo("selected").parts[0].model;
            var sRowPath = oSource.getBindingInfo("selected").binding.oContext.sPath;
            
            this.getView().getModel(sModel).setProperty(sRowPath + "/EDITED", true);
        },

        onDateChange: function(oEvent) {
            Common.openProcessingDialog(me);

            if (this._validationErrors === undefined) this._validationErrors = [];
            
            var oSource = oEvent.getSource();
            var aHeaderData = this.getView().getModel("grpheader").getData();
            var vDelvDate = oEvent.getParameters().value;
            var oModelRFC = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
            var oParam = {};
            var me = this;            

            oParam["PurchPlant"] = aHeaderData[0].PURCHPLANT;
            oParam["N_GetFtyCalDateParam"] = [{
                CorrectOption: "+",
                Date: sapDateFormat.format(new Date(vDelvDate)),
                FactoryCalendarId: ""
            }]

            oParam["N_GetFtyCalDateReturn"] = [];
            
            oModelRFC.create("/GetFtyCalDateSet", oParam, {
                method: "POST",
                success: function(oData, oResponse) {
                    Common.closeProcessingDialog(me);

                    var vRetDate = sapDateFormat.format(new Date(oData["N_GetFtyCalDateReturn"].results[0].Date));
                    var vParamDate = sapDateFormat.format(new Date(oData["N_GetFtyCalDateParam"].results[0].Date));
                    var vPrevDateVal = me._prevDelvDate;

                    if (vRetDate !== vParamDate) {
                        var oData = {
                            Process: "delvdate-update",
                            Text: me.getView().getModel("ddtext").getData()["INFO_NEXT_DELVDATE"] + " " + oData["N_GetFtyCalDateReturn"].results[0].Date + ", " + me.getView().getModel("ddtext").getData()["CONTINUE"] + "?",
                            NewDelvDate: vRetDate,
                            DelvDate: vPrevDateVal,
                            Source: oSource
                        }
            
                        if (!me._ConfirmDialog) {
                            me._ConfirmDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.ConfirmDialog", me);
            
                            me._ConfirmDialog.setModel(new JSONModel(oData));
                            me.getView().addDependent(me._ConfirmDialog);
                        }
                        else me._ConfirmDialog.setModel(new JSONModel(oData));
                            
                        me._ConfirmDialog.open();                        
                    }
                },
                error: function (err) { }
            });

            this._bDetailsChanged = false;
        },

        onClickDate: function(oEvent) {
            var sActiveGroup = this.getView().getModel("ui").getData().activeGroup;
            this._prevDelvDate = this.getView().getModel("detail").getData().filter(fItem => fItem.GROUP === sActiveGroup)[0].DELVDATE;
        },

        onUpdDate: function(oEvent) {
            var me = this;

            var changeDlvDate = {
                Title: this.getView().getModel("ddtext").getData()["CHANGEDELVDATE"],
                POLabel: this.getView().getModel("ddtext").getData()["PONO"],
                NewDlvDateLabel: this.getView().getModel("ddtext").getData()["NEWDELVDATE"],
                PONO: this.getView().getModel("VPOSplitHdr").getData().PONO,
                NewDlvDate: ""
            };
            
            if (!this._oChangeDateDialog) {
                this._oChangeDateDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.ChangeDlvDateSplitPODialog", this);
                this.getView().addDependent(this._oChangeDateDialog);

                var oDialogEventDelegate = {
                    onkeydown: function (oEvent) {
                        me.onKeyDown(oEvent);
                    }
                };

                this._oChangeDateDialog.addEventDelegate(oDialogEventDelegate);
            }
            
            this._oChangeDateDialog.setModel(new JSONModel(changeDlvDate));
            this._oChangeDateDialog.open(); 
            this._changeDateDialog = true;
        },

        onSaveChangeVPODelvDate: function(oEvent) {
            var oHeaderData = this.getView().getModel("VPOSplitHdr").getData();
            var oModelRFC = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
            var oParam = {};
            var me = this;
            var oDatePickerValue = this._oChangeDateDialog.getModel().getData().NewDlvDate;

            if (oDatePickerValue === "") {
                MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_DLVDT_EMPTY"]);
                return;
            }

            oParam["PurchPlant"] = oHeaderData.PURCHPLANT;
            oParam["N_GetFtyCalDateParam"] = [{
                CorrectOption: "+",
                Date: sapDateFormat.format(new Date(oDatePickerValue)),
                FactoryCalendarId: ""
            }]

            oParam["N_GetFtyCalDateReturn"] = [];

            oModelRFC.create("/GetFtyCalDateSet", oParam, {
                method: "POST",
                success: function(oData, oResponse) {
                    var vParamDate = sapDateFormat.format(new Date(oDatePickerValue));
                    var vRetDate = sapDateFormat.format(new Date(oData["N_GetFtyCalDateReturn"].results[0].Date))

                    if (vRetDate !== vParamDate) {
                        var oData = {
                            Process: "batchdelvdate-update",
                            Text: me.getView().getModel("ddtext").getData()["INFO_NEXT_DELVDATE"] + " " + dateFormat.format(new Date(oData["N_GetFtyCalDateReturn"].results[0].Date)) + ", " + me.getView().getModel("ddtext").getData()["CONTINUE"] + "?",
                            DelvDate: oData["N_GetFtyCalDateReturn"].results[0].Date
                        }
            
                        if (!me._ConfirmDialog) {
                            me._ConfirmDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.ConfirmDialog", me);
            
                            me._ConfirmDialog.setModel(new JSONModel(oData));
                            me.getView().addDependent(me._ConfirmDialog);
                        }
                        else me._ConfirmDialog.setModel(new JSONModel(oData));
                            
                        me._ConfirmDialog.open();                        
                    }
                    else {
                        me.batchUpdateDelvDate(oDatePickerValue);
                    }
                },
                error: function (err) { }
            });
        },

        batchUpdateDelvDate(arg) {
            console.log(arg)
            console.log(dateFormat.format(new Date(arg)))

            this.getView().getModel("VPOSplitDtl").getData().forEach(item => {
                item.DELDT = dateFormat.format(new Date(arg));
            })

            console.log(this.getView().getModel("VPOSplitDtl").getData())
            this.byId("VPOSplitDtlTab").setModel(new JSONModel(this.getView().getModel("VPOSplitDtl").getData()), "VPOSplitDtl");
            this.byId("VPOSplitDtlTab").bindRows({path: "VPOSplitDtl>/"});
            this._oChangeDateDialog.close();

            MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_DELVDATE_UPDATED"]);
        },

        onCancelChangeVPODelvDate: function(oEvent) {
            this._oChangeDateDialog.close();
            this._changeDateDialog = false;
        },

        onFabSpecs: function(oEvent) {
            this._bFabSpecsChanged = false;

            if (this.getView().getModel("ui").getData().activeGroup === "") {
                this.getView().getModel("ui").setProperty("/activeGroup", this.getView().getModel("header").getData()[0].GROUP);
            }

            var sActiveGroup = this.getView().getModel("ui").getData().activeGroup;
            
            if (!this._FabSpecsDialog) {
                this._FabSpecsDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.FabSpecsDialog", this);    
                
                this._FabSpecsDialog.setModel(
                    new JSONModel({
                        items: this.getView().getModel("fabspecs").getData()[sActiveGroup]
                    }, "fs")
                )

                this.getView().addDependent(this._FabSpecsDialog);
            }
            else {
                // this._FabSpecsDialog.getModel().setProperty("/items", this.getView().getModel("fabspecs").getData()[sActiveGroup]);
                this._FabSpecsDialog.setModel(
                    new JSONModel({
                        items: this.getView().getModel("fabspecs").getData()[sActiveGroup]
                    }, "fs")
                )
            }

            this._aFabSpecsDataBeforeChange = jQuery.extend(true, [], this.getView().getModel("fabspecs").getData()[sActiveGroup]);
            
            // this._FabSpecsDialog.setTitle(this.getView().getModel("ddtext").getData()["FABSPECS"] + " - " + this.getView().getModel("ddtext").getData()["GROUP"] + " " + sActiveGroup);
            this._FabSpecsDialog.setTitle(this.getView().getModel("ddtext").getData()["FABSPECS"]);
            this._FabSpecsDialog.open();         
        },

        onSaveFabSpecs: function(oEvent) {
            var sActiveGroup = this.getView().getModel("ui").getData().activeGroup;
            this.getView().getModel("fabspecs").getData()[sActiveGroup].forEach(item => {
                item.STATUS = "UPDATED";
                // item.ZZMAKT = sap.ui.getCore().byId("ZZMAKT").getValue();
                item.ZZHAFE = sap.ui.getCore().byId("ZZHAFE").getValue();
                item.ZZSHNK = sap.ui.getCore().byId("ZZSHNK").getValue();
                item.ZZCHNG = sap.ui.getCore().byId("ZZCHNG").getValue();
                item.ZZSTAN = sap.ui.getCore().byId("ZZSTAN").getValue();
                item.ZZDRY = sap.ui.getCore().byId("ZZDRY").getValue();
                item.ZZCFWA = sap.ui.getCore().byId("ZZCFWA").getValue();
                item.ZZCFCW = sap.ui.getCore().byId("ZZCFCW").getValue();
                item.ZZSHRQ = sap.ui.getCore().byId("ZZSHRQ").getValue();
                item.ZZSHDA = sap.ui.getCore().byId("ZZSHDA").getValue();
                item.PLANMONTH = sap.ui.getCore().byId("PLANMONTH1").getText();
                item.ZZREQ1 = sap.ui.getCore().byId("ZZREQ1").getValue();
                item.ZZREQ2 = sap.ui.getCore().byId("ZZREQ2").getValue();
                // item.EBELP = sap.ui.getCore().byId("EBELP").getValue();
                // item.EBELN = sap.ui.getCore().byId("EBELN").getValue();
            });

            MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_FABSPECS_SAVED"])

            this._bFabSpecsChanged = false;
        },

        onDeleteFabSpecs: function(oEvent) {
            var oData = {
                Process: "fabspecs-delete",
                Text: "Confirm delete fab specs?"
            }

            // var oJSONModel = new JSONModel();
            // oJSONModel.setData(oData);

            if (!this._ConfirmDialog) {
                this._ConfirmDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.ConfirmDialog", this);

                this._ConfirmDialog.setModel(new JSONModel(oData));
                this.getView().addDependent(this._ConfirmDialog);
            }
            else this._ConfirmDialog.setModel(new JSONModel(oData));
                
            this._ConfirmDialog.open(); 
        },

        clearFabSpecs() {
            var sActiveGroup = this.getView().getModel("ui").getData().activeGroup;
            var oData = this.getView().getModel("fabspecs").getData()[sActiveGroup];

            Object.keys(oData[0]).forEach(key => {
                oData[0][key] = "";
            })

            oData[0].STATUS = "DELETED";           
            
            this._FabSpecsDialog.close();

            var oForm = sap.ui.getCore().byId("FabSpecsForm");
            oForm.getFormContainers()[0].getFormElements()[0].getFields()[0].setValue(" ");
            oForm.getFormContainers()[0].getFormElements()[0].getFields()[0].setValue("");
        },

        onCloseFabSpecs: function(oEvent) {
            if (this._bFabSpecsChanged) {
                var oData = {
                    Process: "fabspecs-close",
                    Text: this.getView().getModel("ddtext").getData()["CONF_DISCARD_CHANGE"]
                }

                // var oJSONModel = new JSONModel();
                // oJSONModel.setData(oData);

                if (!this._ConfirmDialog) {
                    this._ConfirmDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.ConfirmDialog", this);

                    this._ConfirmDialog.setModel(new JSONModel(oData));
                    this.getView().addDependent(this._ConfirmDialog);
                }
                else this._ConfirmDialog.setModel(new JSONModel(oData));
                    
                this._ConfirmDialog.open();
            }
            else {
                this._headerTextDialog = false;
                this._oHeaderTextDialog.close();
            }
        },

        beforeOpenFabSpecs: function(oEvent) {
            var sActiveGroup = this.getView().getModel("ui").getData().activeGroup;

            oEvent.getSource().setInitialFocus(sap.ui.getCore().byId("ZZMAKT"));
            var oData = this.getView().getModel("fabspecs").getData()[sActiveGroup];

            sap.ui.getCore().byId("ZZMAKT").setValue(oData[0].ZZMAKT);
            sap.ui.getCore().byId("ZZHAFE").setValue(oData[0].ZZHAFE);
            sap.ui.getCore().byId("ZZSHNK").setValue(oData[0].ZZSHNK);
            sap.ui.getCore().byId("ZZCHNG").setValue(oData[0].ZZCHNG);
            sap.ui.getCore().byId("ZZSTAN").setValue(oData[0].ZZSTAN);
            sap.ui.getCore().byId("ZZDRY").setValue(oData[0].ZZDRY);
            sap.ui.getCore().byId("ZZCFWA").setValue(oData[0].ZZCFWA);
            sap.ui.getCore().byId("ZZCFCW").setValue(oData[0].ZZCFCW);
            sap.ui.getCore().byId("ZZSHRQ").setValue(oData[0].ZZSHRQ);
            sap.ui.getCore().byId("ZZSHDA").setValue(oData[0].ZZSHDA);
            sap.ui.getCore().byId("PLANMONTH1").setText(oData[0].PLANMONTH);
            sap.ui.getCore().byId("ZZREQ1").setValue(oData[0].ZZREQ1);
            sap.ui.getCore().byId("ZZREQ2").setValue(oData[0].ZZREQ2);
            // sap.ui.getCore().byId("EBELP").setValue(oData[0].EBELP);
            // sap.ui.getCore().byId("EBELN").setValue(oData[0].EBELN);
        },

        onFabSpecsChange: function(oEvent) {
            this._bFabSpecsChanged = true;
        },

        onHdrText: function(oEvent) {
            var me = this;
            this._bRemarksChanged = false;
            this._bPackInsChanged = false;

            if (!this._oHeaderTextDialog) {
                this._oHeaderTextDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.HeaderTextDialog", this);

                this._oHeaderTextDialog.setModel(
                    new JSONModel({
                        rem_items: this.getView().getModel("remarks").getData(),
                        packins_items: this.getView().getModel("packins").getData(),
                        fs: this.getView().getModel("fabspecs").getData()
                    })
                )

                this.getView().addDependent(this._oHeaderTextDialog);

                var oDialogEventDelegate = {
                    onkeydown: function (oEvent) {
                        me.onKeyDown(oEvent);
                    }
                };

                this._oHeaderTextDialog.addEventDelegate(oDialogEventDelegate);
            }
            else {
                this._oHeaderTextDialog.getModel().setProperty("/rem_items", this.getView().getModel("remarks").getData());
                this._oHeaderTextDialog.getModel().setProperty("/packins_items", this.getView().getModel("packins").getData());
                this._oHeaderTextDialog.getModel().setProperty("/fs", this.getView().getModel("fabspecs").getData());
            }

            this._aRemarksDataBeforeChange = jQuery.extend(true, [], this.getView().getModel("remarks").getData());
            this._aPackInsDataBeforeChange = jQuery.extend(true, [], this.getView().getModel("packins").getData());
            this._aFabSpecsDataBeforeChange = jQuery.extend(true, [], this.getView().getModel("fabspecs").getData());

            this._oHeaderTextDialog.setTitle(this.getView().getModel("ddtext").getData()["HEADERTEXT"]);
            this._oHeaderTextDialog.open(); 

            var oHeaderData = this.getView().getModel("VPOSplitHdr").getData();
            var oHdrTxtTab = sap.ui.getCore().byId("ITB1");
            oHdrTxtTab.setSelectedKey("remarks");

            if (oHeaderData.DOCTYPE !== "ZFAB") {
                oHdrTxtTab.getItems().forEach(item => {
                    if (item.getProperty("key") === "fabspecs") { item.setProperty("enabled", false) }
                });
            }
            else {
                oHdrTxtTab.getItems().forEach(item => {
                    item.setProperty("enabled", true);
                });
            }

            var oData = this.getView().getModel("fabspecs").getData();
            sap.ui.getCore().byId("ZZMAKT").setValue(oData[0].ZZMAKT);
            sap.ui.getCore().byId("ZZHAFE").setValue(oData[0].ZZHAFE);
            sap.ui.getCore().byId("ZZSHNK").setValue(oData[0].ZZSHNK);
            sap.ui.getCore().byId("ZZCHNG").setValue(oData[0].ZZCHNG);
            sap.ui.getCore().byId("ZZSTAN").setValue(oData[0].ZZSTAN);
            sap.ui.getCore().byId("ZZDRY").setValue(oData[0].ZZDRY);
            sap.ui.getCore().byId("ZZCFWA").setValue(oData[0].ZZCFWA);
            sap.ui.getCore().byId("ZZCFCW").setValue(oData[0].ZZCFCW);
            sap.ui.getCore().byId("ZZSHRQ").setValue(oData[0].ZZSHRQ);
            sap.ui.getCore().byId("ZZSHDA").setValue(oData[0].ZZSHDA);
            sap.ui.getCore().byId("PLANMONTH1").setText(oData[0].PLANMONTH);
            sap.ui.getCore().byId("ZZREQ1").setValue(oData[0].ZZREQ1);
            sap.ui.getCore().byId("ZZREQ2").setValue(oData[0].ZZREQ2);

            this._sActiveTable = sap.ui.getCore().byId("ITB1").getSelectedKey() + "Tab";
            this._headerTextDialog = true;

            var oInputEventDelegate = {
                onkeydown: function(oEvent){
                    me.onInputKeyDown(oEvent);
                },
            };

            sap.ui.getCore().byId("remarksTab").getColumns()[1].getTemplate().addEventDelegate(oInputEventDelegate);
            sap.ui.getCore().byId("packinsTab").getColumns()[1].getTemplate().addEventDelegate(oInputEventDelegate);
        },

        New() {
            this._sActiveTable = sap.ui.getCore().byId("ITB1").getSelectedKey() + "Tab";
            this.addHdrTxt();
        },

        onAddHdrTxt: function(oEvent) {
            this._sActiveTable = sap.ui.getCore().byId("ITB1").getSelectedKey() + "Tab";            
            this.addHdrTxt();
        },

        addHdrTxt() {
            var oTable, oData;
            
            sap.ui.getCore().byId("btnAddHdrTxt").focus();

            if (this._sActiveTable === "remarksTab") {
                oTable = sap.ui.getCore().byId("remarksTab");
                oData = oTable.getModel().getProperty('/rem_items');

                if (oData === undefined) {
                    var aDataRemItems = [];
    
                    aDataRemItems.push({
                        ITEM: "1",
                        REMARKS: "",
                        STATUS: ""
                    });
        
                    this.getView().getModel("remarks").setProperty("/", aDataRemItems);
                    this._oHeaderTextDialog.getModel().setProperty("/rem_items", this.getView().getModel("remarks").getData());
                }
            }
            else {
                oTable = sap.ui.getCore().byId("packinsTab");
                oData = oTable.getModel().getProperty('/packins_items');    
                
                if (oData === undefined) {
                    var aDataPackInsItems = [];
    
                    aDataPackInsItems.push({
                        ITEM: "1",
                        PACKINS: "",
                        STATUS: ""
                    });
        
                    this.getView().getModel("packins").setProperty("/", aDataPackInsItems);
                    this._oHeaderTextDialog.getModel().setProperty("/packins_items", this.getView().getModel("packins").getData());
                }
            }
                        
            if (oData !== undefined) {
                var length = oData.length;
                var lastSeqno = 0;
    
                if (length > 0) {
                    lastSeqno = parseInt(oData[length - 1].ITEM);
                }
    
                lastSeqno++;
    
                var seqno = lastSeqno.toString();
    
                oData.push({
                    "ITEM": seqno,
                    "STATUS": "NEW"
                });

                oTable.getBinding("rows").refresh();
            }
        },

        onSaveHdrTxt: function(oEvent) {
            var activeTab = sap.ui.getCore().byId("ITB1").getSelectedKey();
            sap.ui.getCore().byId("btnSaveHdrTxt").focus();

            if (activeTab === "remarks") {
                if (this._oHeaderTextDialog.getModel().getData().rem_items.filter(item => item.REMARKS === "").length > 0) {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_INPUT_REMARKS"]);
                }
                else {
                    this._bRemarksChanged = false;
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_REMARKS_SAVED"]);

                    this.getView().getModel("remarks").setProperty('/', this._oHeaderTextDialog.getModel().getData().rem_items);
                    this.getView().getModel("remarks").getData().forEach(item => item.STATUS = "UPDATED");
                    this._aRemarksDataBeforeChange = jQuery.extend(true, [], this.getView().getModel("remarks").getData());
                }
            }
            else if (activeTab === "packins") {
                if (this._oHeaderTextDialog.getModel().getData().packins_items.filter(item => item.PACKINS === "").length > 0) {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_INPUT_PACKINS"]);
                }
                else {
                    // this._oHeaderTextDialog.close();
                    this._bPackInsChanged = false;
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_PACKINS_SAVED"]);

                    this.getView().getModel("packins").setProperty('/', this._oHeaderTextDialog.getModel().getData().packins_items);
                    this.getView().getModel("packins").getData().forEach(item => item.STATUS = "UPDATED");
                    this._aPackInsDataBeforeChange = jQuery.extend(true, [], this.getView().getModel("packins").getData());
                }
            }
            else {
                this.onSaveFabSpecs();
            }
        },

        onDeleteHdrTxt: function(oEvent) {
            var activeTab = sap.ui.getCore().byId("ITB1").getSelectedKey();
            var oTable, sProcess;
            sap.ui.getCore().byId("btnDeleteHdrTxt").focus();

            if (activeTab === "fabspecs") {
                this.onDeleteFabSpecs();
            }
            else {
                if (activeTab === "remarks") {
                    oTable = sap.ui.getCore().byId("remarksTab");
                    sProcess = "remarks-delete";
                } 
                else if (activeTab === "packins") {
                    oTable = sap.ui.getCore().byId("packinsTab");
                    sProcess = "packins-delete";
                }

                if (oTable.getSelectedIndices().length === 0) {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_SEL_RECORD_TO_DELETE"]);
                }
                else {
                    var oData = {
                        Process: sProcess,
                        Text: this.getView().getModel("ddtext").getData()["CONF_DELETE_RECORDS"]
                    }
                    
                    if (!this._ConfirmDialog) {
                        this._ConfirmDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.ConfirmDialog", this);
    
                        this._ConfirmDialog.setModel(new JSONModel(oData));
                        this.getView().addDependent(this._ConfirmDialog);
                    }
                    else this._ConfirmDialog.setModel(new JSONModel(oData));
                        
                    this._ConfirmDialog.open(); 
                }
            }
        },

        onCloseHdrTxt: function(oEvent) {
            var activeTab = sap.ui.getCore().byId("ITB1").getSelectedKey();
            var oData;
            var bProceed = true;
            var iNew = 0;

            if (activeTab === "fabspecs") {
                this.onCloseFabSpecs();
            }
            else {
                if (activeTab === "remarks") {
                    if (this._oHeaderTextDialog.getModel().getData().rem_items !== undefined) {
                        iNew = this._oHeaderTextDialog.getModel().getData().rem_items.filter(item => item.STATUS === "NEW").length;
                    }
    
                    if (this._bRemarksChanged || iNew > 0) {
                        bProceed = false;
    
                        oData = {
                            Process: "remarks-close",
                            Text: this.getView().getModel("ddtext").getData()["CONF_DISCARD_CHANGE"]
                        }
                    }
                }
                else if (activeTab === "packins") {
                    if (this._oHeaderTextDialog.getModel().getData().packins_items !== undefined) {
                        iNew = this._oHeaderTextDialog.getModel().getData().packins_items.filter(item => item.STATUS === "NEW").length;
                    }
    
                    if (this._bPackInsChanged || iNew > 0) {
                        bProceed = false;
    
                        oData = {
                            Process: "packins-close",
                            Text: this.getView().getModel("ddtext").getData()["CONF_DISCARD_CHANGE"]
                        }
                    }
                }
    
                if (!bProceed) {   
                    if (!this._ConfirmDialog) {
                        this._ConfirmDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.ConfirmDialog", this);
    
                        this._ConfirmDialog.setModel(new JSONModel(oData));
                        this.getView().addDependent(this._ConfirmDialog);
                    }
                    else this._ConfirmDialog.setModel(new JSONModel(oData));
                        
                    this._ConfirmDialog.open();
                }
                else {
                    this._headerTextDialog = false;
                    this._oHeaderTextDialog.close();
                }
            }
        },

        onRemarksChange: function(oEvent) {
            this._bRemarksChanged = true;
        },

        onPackInsChange: function(oEvent) {
            this._bPackInsChanged = true;
        },

        onSelectHdrTxtTab: function(oEvent) {
            var activeTab = sap.ui.getCore().byId("ITB1").getSelectedKey();
            var bProceed = true;
            var iNew = 0;

            this._sActiveTable = activeTab + "Tab";

            if (activeTab === "remarks") {
                sap.ui.getCore().byId("btnAddHdrTxt").setVisible(true);

                if (this._oHeaderTextDialog.getModel().getData().rem_items !== undefined) {
                    iNew = this._oHeaderTextDialog.getModel().getData().rem_items.filter(item => item.STATUS === "NEW").length;
                }

                if (this._bPackInsChanged) {
                    bProceed = false;

                    oData = {
                        Process: "packins-cancel",
                        Text: this.getView().getModel("ddtext").getData()["CONF_DISCARD_CHANGE"]
                    }
                }
                else if (this._bFabSpecsChanged) {
                    bProceed = false;

                    oData = {
                        Process: "fabspecs-cancel",
                        Text: this.getView().getModel("ddtext").getData()["CONF_DISCARD_CHANGE"]
                    }                    
                }
            }
            else if (activeTab === "packins") {
                sap.ui.getCore().byId("btnAddHdrTxt").setVisible(true);

                if (this._oHeaderTextDialog.getModel().getData().packins_items !== undefined) {
                    iNew = this._oHeaderTextDialog.getModel().getData().packins_items.filter(item => item.STATUS === "NEW").length;
                }

                if (this._bRemarksChanged) {
                    bProceed = false;

                    oData = {
                        Process: "remarks-cancel",
                        Text: this.getView().getModel("ddtext").getData()["CONF_DISCARD_CHANGE"]
                    }
                }
                else if (this._bFabSpecsChanged) {
                    bProceed = false;

                    oData = {
                        Process: "fabspecs-cancel",
                        Text: this.getView().getModel("ddtext").getData()["CONF_DISCARD_CHANGE"]
                    }                    
                }
            }
            else if (activeTab === "fabspecs") {
                sap.ui.getCore().byId("btnAddHdrTxt").setVisible(false);
                
                if (this._oHeaderTextDialog.getModel().getData().fs !== undefined) {
                    iNew = this._oHeaderTextDialog.getModel().getData().fs.filter(item => item.STATUS === "UPDATED").length;
                }

                if (this._bRemarksChanged) {
                    bProceed = false;

                    oData = {
                        Process: "remarks-cancel",
                        Text: this.getView().getModel("ddtext").getData()["CONF_DISCARD_CHANGE"]
                    }
                }
                else if (this._bPackInsChanged) {
                    bProceed = false;

                    oData = {
                        Process: "packins-cancel",
                        Text: this.getView().getModel("ddtext").getData()["CONF_DISCARD_CHANGE"]
                    }
                }
            }

            if (!bProceed) {
                // var oJSONModel = new JSONModel();
                // oJSONModel.setData(oData);

                if (!this._ConfirmDialog) {
                    this._ConfirmDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.ConfirmDialog", this);

                    this._ConfirmDialog.setModel(new JSONModel(oData));
                    this.getView().addDependent(this._ConfirmDialog);
                }
                else this._ConfirmDialog.setModel(new JSONModel(oData));
                    
                this._ConfirmDialog.open();
            }
        },

        onCloseConfirmDialog: function(oEvent) {
            if (this._ConfirmDialog.getModel().getData().Process === "remarks-close") {
                this._bRemarksChanged = false;
                this._headerTextDialog = false;
                this._oHeaderTextDialog.close();

                this.getView().getModel("remarks").setProperty('/', this._aRemarksDataBeforeChange);
                this.getView().getModel("packins").setProperty('/', this._aPackInsDataBeforeChange);
                this.getView().getModel("fabspecs").setProperty('/', this._aFabSpecsDataBeforeChange);
            }
            else if (this._ConfirmDialog.getModel().getData().Process === "packins-close") {
                this._bPackInsChanged = false;
                this._headerTextDialog = false;
                this._oHeaderTextDialog.close();

                this.getView().getModel("packins").setProperty('/', this._aPackInsDataBeforeChange);
                this.getView().getModel("remarks").setProperty('/', this._aRemarksDataBeforeChange);
                this.getView().getModel("fabspecs").setProperty('/', this._aFabSpecsDataBeforeChange);
            }
            else if (this._ConfirmDialog.getModel().getData().Process === "fabspecs-close") {
                this._bFabSpecsChanged = false;
                this._headerTextDialog = false;
                this._oHeaderTextDialog.close();
                
                this.getView().getModel("fabspecs").setProperty('/', this._aFabSpecsDataBeforeChange);
                this.getView().getModel("remarks").setProperty('/', this._aRemarksDataBeforeChange);
                this.getView().getModel("packins").setProperty('/', this._aPackInsDataBeforeChange);
            }
            else if (this._ConfirmDialog.getModel().getData().Process === "remarks-delete") {
                var oTable = sap.ui.getCore().byId("remarksTab");
                var oData = this._oHeaderTextDialog.getModel().getData().rem_items; 
                var selected = oTable.getSelectedIndices();

                oData = oData.filter(function (value, index) {
                    return selected.indexOf(index) === -1;
                })

                oTable.clearSelection();

                this._oHeaderTextDialog.getModel().setProperty("/rem_items", oData);
                this.getView().getModel("remarks").setProperty("/",  oData);

                if (oData.length === 0) this._bRemarksChanged = false;
            }
            else if (this._ConfirmDialog.getModel().getData().Process === "packins-delete") {
                var oTable = sap.ui.getCore().byId("packinsTab");
                var oData = this._oHeaderTextDialog.getModel().getData().packins_items; 
                var selected = oTable.getSelectedIndices();
                
                oData = oData.filter(function (value, index) {
                    return selected.indexOf(index) === -1;
                })
                
                oTable.clearSelection(); 
                
                this._oHeaderTextDialog.getModel().setProperty("/packins_items", oData);
                this.getView().getModel("packins").setProperty("/",  oData);

                if (oData.length === 0) this._bPackInsChanged = false;
            }
            else if (this._ConfirmDialog.getModel().getData().Process === "fabspecs-delete") {
                this.clearFabSpecs();
                this._bFabSpecsChanged = false;
                this._FabSpecsDialog.close();
                MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_DATA_DELETED"]);
            }
            else if (this._ConfirmDialog.getModel().getData().Process === "remarks-cancel") {
                this._bRemarksChanged = false;
                this.getView().getModel("remarks").setProperty('/', this._aRemarksDataBeforeChange);
            }
            else if (this._ConfirmDialog.getModel().getData().Process === "packins-cancel") {
                this._bPackInsChanged = false;
                this.getView().getModel("packins").setProperty('/', this._aPackInsDataBeforeChange);
            }
            else if (this._ConfirmDialog.getModel().getData().Process === "fabspecs-cancel") {
                this._bFabSpecsChanged = false;
                this.getView().getModel("fabspecs").setProperty('/', this._aFabSpecsDataBeforeChange);
            }
            else if (this._ConfirmDialog.getModel().getData().Process === "details-cancel") {
                this.setRowReadMode();

                this.byId("btnEditSplitPODtl").setVisible(true);
                this.byId("btnSaveSplitPODtl").setVisible(false);
                this.byId("btnCancelSplitPODtl").setVisible(false);
                this.byId("btnDeleteSplitPODtl").setVisible(true);
                this.byId("btnRefreshSplitPODtl").setVisible(true);
    
                this.byId("btnUpdDateSplitPOHdr").setEnabled(true);
                this.byId("btnHdrTxtSplitPOHdr").setEnabled(true);
                this.byId("btnGenPOSplitPOHdr").setEnabled(true);
                this.byId("btnCancelPOSplitPOHdr").setEnabled(true);
    
                this._sDataMode = "READ";

                this.getView().getModel("VPOSplitDtl").setProperty("/", this._aDataBeforeChange);
            }
            else if (this._ConfirmDialog.getModel().getData().Process === "splitpo-cancel") {
                var oHistory, sPreviousHash;

                this.getOwnerComponent().getModel("UI_MODEL").setProperty("/refresh", false);

                if (sap.ui.core.routing.History !== undefined) {
                    oHistory = sap.ui.core.routing.History.getInstance();
                    sPreviousHash = oHistory.getPreviousHash();
                }

                if (sPreviousHash !== undefined) {
                    window.history.go(-1);
                } else { 
                    var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                    oRouter.navTo("vendorpodetail", {}, true /*no history*/);
                }

                // if (this._sDataMode === "EDIT") {
                //     this.setRowReadMode();
        
                //     this.byId("btnEditSplitPODtl").setVisible(true);
                //     this.byId("btnSaveSplitPODtl").setVisible(false);
                //     this.byId("btnCancelSplitPODtl").setVisible(false);
                //     this.byId("btnDeleteSplitPODtl").setVisible(true);
                //     this.byId("btnRefreshSplitPODtl").setVisible(true);
        
                //     this.byId("btnUpdDateSplitPOHdr").setEnabled(true);
                //     this.byId("btnHdrTxtSplitPOHdr").setEnabled(true);
                //     this.byId("btnGenPOSplitPOHdr").setEnabled(true);
                //     this.byId("btnCancelPOSplitPOHdr").setEnabled(true);
                // }
            }
            else if (this._ConfirmDialog.getModel().getData().Process === "batchdelvdate-update") {
                this.batchUpdateDelvDate(this._ConfirmDialog.getModel().getData().DelvDate);
            }

            this._ConfirmDialog.close();
        },  

        onCancelConfirmDialog: function(oEvent) {
            if (this._ConfirmDialog.getModel().getData().Process === "remarks-cancel") {
                sap.ui.getCore().byId("ITB1").setSelectedKey("remarks");
                sap.ui.getCore().byId("ITB1").selectedKey = "remarks";
            }
            else if (this._ConfirmDialog.getModel().getData().Process === "packins-cancel") {
                sap.ui.getCore().byId("ITB1").setSelectedKey("packins");
                sap.ui.getCore().byId("ITB1").selectedKey = "packins";
            }
            else if (this._ConfirmDialog.getModel().getData().Process === "fabspecs-cancel") {
                sap.ui.getCore().byId("ITB1").setSelectedKey("fabspecs");
                sap.ui.getCore().byId("ITB1").selectedKey = "fabspecs";
            }

            this._ConfirmDialog.close();
        },

        onGeneratePO: async function(oEvent) {
            var me = this;
            var oModelRFC = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
            var bProceed = true;
            var aDtlReqFields = [];

            if (this.getView().getModel("VPOSplitDtl").getData().length === 0) {
                MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_DETAIL_DATA"])
                return;
            }

            if (this._validationErrors.length > 0) {
                MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_CHECK_INVALID_ENTRIES"]);
                return;
            }

            //new item
            var vMultiplier = 10;
            this.getView().getModel("VPOSplitDtl").getData().forEach((item, index) => {
                var vNewItem = ((index + 1) * vMultiplier) + "";
                while (vNewItem.length < 5) vNewItem = "0" + vNewItem;
                item.NEWITEM = vNewItem;
            })

            this.byId("splitPOHeaderForm").getFormContainers().forEach(c => {
                c.getFormElements().forEach(e => {
                    if (e.mAggregations.label.mProperties !== undefined) {
                        if (e.mAggregations.label.mProperties.required) {
                            if (e.mAggregations.fields[0].mProperties.value === "") {
                                bProceed = false;
                                e.mAggregations.fields[0].setValueState("Error");
                            }
                            else {
                                e.mAggregations.fields[0].setValueState("None");
                            }
                        }
                    }
                })
            })
            
            if (!bProceed) {
                MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_INPUT_HDR_REQD_FIELDS"]);
                return;
            }

            this._oModelColumns["VPOSplitDtl"].filter(fItem => fItem.required === true).forEach(item => {
                this.getView().getModel("VPOSplitDtl").getData().forEach(val => {
                    if (val[item.ColumnName] === "") {
                        bProceed = false;
                        aDtlReqFields.push(this.getView().getModel("ddtext").getData()[item.ColumnName]);
                    }
                })
            })

            if (!bProceed) {
                MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_INPUT_DTL_REQD_FIELDS"].replace(".","") + ":\r\n" + aDtlReqFields.join(", "));
                return;
            }

            Common.openProcessingDialog(this);

            if (!this._isInfoRecRetrieve) {
                bProceed = await this.getInfoRecord(this);
            }

            if (!bProceed) {
                Common.closeProcessingDialog(this);
                return;
            }

            var oHeaderData = this.getView().getModel("VPOSplitHdr").getData();

            this._oModel.read("/GetNoRangeCodeSet", {
                urlParameters: {
                    "$filter": "SBU eq '" + this._sbu + "' and DOCTYP eq '" + oHeaderData.DOCTYPE + "' and COMPANY eq '" +  oHeaderData.COMPANY + "'"
                },
                success: function (oData, oResponse) {
                    if (oData.results.length === 0) {
                        Common.closeProcessingDialog(me);
                        MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_NO_RANGE_CODE"]);
                        return;
                    }

                    var oParam = {};

                    oParam["EReturnno"] = "";
                    oParam['N_GetNumberParam'] = [{
                        "INorangecd": oData.results[0].NORANGECD,
                        "IKeycd": "",
                        "IUserid": "",
                    }];
                    oParam['N_GetNumberReturn'] = [];
        
                    oModelRFC.create("/GetNumberSet", oParam, {
                        method: "POST",
                        success: function(oResult, oResponse) {
                            if (oResult.EReturnno === "") {
                                Common.closeProcessingDialog(me);
                                MessageBox.information(oResult.N_GetNumberReturn.results[0].Type + " " + oResult.N_GetNumberReturn.results[0].Message);
                                return;
                            }
                            
                            var sPONo = oResult.EReturnno;
                            var infoRecCheck = false;

                            var oParamCPO = {};
                            var oParamCPOHdrData = [{
                                DocDate: sapDateFormat.format(new Date(oHeaderData.PODT)) + "T00:00:00",
                                DocType: oHeaderData.DOCTYPE,
                                CoCode: oHeaderData.COMPANY,
                                PurchOrg: oHeaderData.PURCHORG,
                                PurGroup: oHeaderData.PURCHGRP,
                                Vendor: oHeaderData.VENDOR,
                                PoNumber: oResult.EReturnno,
                                CreatDate: sapDateFormat.format(new Date(oHeaderData.PODT)) + "T00:00:00",
                                Pmnttrms: oHeaderData.PAYMNTTERMS,
                                Currency: oHeaderData.CURRENCY,
                                ExchRate: "0",
                                Incoterms1: oHeaderData.INCOTERMS,
                                Incoterms2: oHeaderData.DEST,
                                OurRef: oHeaderData.SHIPTOPLANT
                            }];

                            var oParamCPOHdrTextData = [];

                            me.getView().getModel("remarks").getData().filter(fItem => fItem.STATUS === "UPDATED")
                                .forEach(rem => {
                                    oParamCPOHdrTextData.push({
                                        PoNumber: oResult.EReturnno,
                                        PoItem: "00000",
                                        TextId: "F01",
                                        TextForm: "*",
                                        TextLine: rem.REMARKS
                                    })
                                })

                            me.getView().getModel("packins").getData().filter(fItem => fItem.STATUS === "UPDATED")
                                .forEach(rem => {
                                    oParamCPOHdrTextData.push({
                                        PoNumber: oResult.EReturnno,
                                        PoItem: "00000",
                                        TextId: "F06",
                                        TextForm: "*",
                                        TextLine: rem.PACKINS
                                    })
                                }) 
                                
                            var oParamCPOAddtlDtlsData = [];                                                                                                        
                            var oParamCPOItemData = [];
                            var oParamCPOItemSchedData = [];
                            var oParamCPOClosePRData = [];
                                
                            var oPODocTypeInfo = me.getView().getModel("podoctypeinfo").getData();
                            var bGRInd = false, bIRInd = false, bGRBasedIV = false;

                            if (oPODocTypeInfo.length > 0) {
                                bGRInd = oPODocTypeInfo[0].Wepos === "X" ? true : false;
                                bIRInd = oPODocTypeInfo[0].Repos === "X" ? true : false;
                                bGRBasedIV = oPODocTypeInfo[0].Webre === "X" ? true : false;
                            }

                            var oFabSpecs = me.getView().getModel("fabspecs").getData().filter(fItem => fItem.STATUS === "UPDATED");

                            me.getView().getModel("VPOSplitDtl").getData().forEach(poitem => {
                                if (me.getView().getModel("inforecchk").getData().filter(fItem => fItem.FIELD2 === poitem.MATTYP).length > 0) {
                                    infoRecCheck = true;
                                }

                                if (oPODocTypeInfo.length === 0) {
                                    bIRInd = poitem.INVRCPTIND;
                                    bGRBasedIV = poitem.GRBASEDIVIND
                                }

                                oParamCPOItemData.push({
                                    PoNumber: oResult.EReturnno,
                                    PoItem: poitem.NEWITEM,
                                    Material: poitem.MATNO,
                                    InfoRec: poitem.INFOREC,
                                    MatGrp: poitem.MATGRP,
                                    ShortText: poitem.GMCDESC.length > 40 ? poitem.GMCDESC.slice(0, 40) : poitem.GMCDESC,
                                    Plant: oHeaderData.PURCHPLANT,
                                    PoUnit: poitem.UOM,
                                    OrderprUn: poitem.UOM,
                                    NetPrice: poitem.NETPRICE,
                                    PriceUnit: poitem.PER,
                                    ConvNum1: poitem.NUMERATOR,
                                    ConvDen1: poitem.DENOMINATOR,
                                    DispQuant: poitem.SPLITPOQTY + "",
                                    GrInd: bGRInd,
                                    IrInd: bIRInd,
                                    GrBasediv: bGRBasedIV, 
                                    PreqNo: poitem.PRNO,
                                    PreqItem: poitem.PRITM,
                                    Shipping: oHeaderData.SHIPMODE,
                                    Over_Dlv_Tol: poitem.OVERDELTOL,
                                    Under_Dlv_Tol: poitem.UNDERDELTOL,
                                    Unlimited_Dlv: poitem.UNLIMITED === true ? "X" : ""
                                })

                                oParamCPOItemSchedData.push({
                                    PoNumber: oResult.EReturnno,
                                    PoItem: poitem.NEWITEM,
                                    SchedLine: "1",
                                    DelivDate: sapDateFormat.format(new Date(poitem.DELDT)) + "T00:00:00",
                                    Quantity: poitem.SPLITPOQTY + "",
                                    PreqNo: poitem.PRNO,
                                    PreqItem: poitem.PRITM,
                                    Batch: poitem.BATCH
                                })   
                                
                                oParamCPOClosePRData.push({
                                    Banfn: poitem.PRNO,
                                    Bnfpo: poitem.PRITM, 
                                    Ebakz: poitem.SPLITPOQTY >= poitem.POQTY ? "X" : " "
                                })

                                if (oFabSpecs.length === 0) {
                                    oParamCPOAddtlDtlsData.push({
                                        PoNumber: oResult.EReturnno,
                                        PoItem: poitem.NEWITEM,
                                        Zzhafe: "",
                                        Zzshnk: "",
                                        Zzcfwa: "",
                                        Zzchng: "",
                                        Zzstan: "",
                                        Zzcfcw: "",
                                        Zzdry: "",
                                        Zzreq1: "",
                                        Zzreq2: "",
                                        Zzshrq: "",
                                        Zzprmo: "",
                                        Zzpryr: "",
                                        Zzmakt: poitem.ADDTLDESC
                                    })
                                }
                                else {
                                    if (oFabSpecs[0].ZZSHDA !== "") {
                                        oParamCPOAddtlDtlsData.push({
                                            PoNumber: oResult.EReturnno,
                                            PoItem: poitem.NEWITEM,
                                            Zzhafe: oFabSpecs[0].ZZHAFE,
                                            Zzshnk: oFabSpecs[0].ZZSHNK,
                                            Zzcfwa: oFabSpecs[0].ZZCFWA,
                                            Zzchng: oFabSpecs[0].ZZCHNG,
                                            Zzstan: oFabSpecs[0].ZZSTAN,
                                            Zzcfcw: oFabSpecs[0].ZZCFCW,
                                            Zzdry: oFabSpecs[0].ZZDRY,
                                            Zzreq1: oFabSpecs[0].ZZREQ1,
                                            Zzreq2: oFabSpecs[0].ZZREQ2,
                                            Zzshrq: oFabSpecs[0].ZZSHRQ,
                                            Zzshda: sapDateFormat.format(new Date(oFabSpecs[0].ZZSHDA)) + "T00:00:00",
                                            Zzprmo: oFabSpecs[0].PLANMONTH.slice(5,7),
                                            Zzpryr: oFabSpecs[0].PLANMONTH.slice(0,4),
                                            Zzmakt: poitem.ADDTLDESC
                                        })
                                    }
                                    else {
                                        oParamCPOAddtlDtlsData.push({
                                            PoNumber: oResult.EReturnno,
                                            PoItem: poitem.NEWITEM,
                                            Zzhafe: oFabSpecs[0].ZZHAFE,
                                            Zzshnk: oFabSpecs[0].ZZSHNK,
                                            Zzcfwa: oFabSpecs[0].ZZCFWA,
                                            Zzchng: oFabSpecs[0].ZZCHNG,
                                            Zzstan: oFabSpecs[0].ZZSTAN,
                                            Zzcfcw: oFabSpecs[0].ZZCFCW,
                                            Zzdry: oFabSpecs[0].ZZDRY,
                                            Zzreq1: oFabSpecs[0].ZZREQ1,
                                            Zzreq2: oFabSpecs[0].ZZREQ2,
                                            Zzshrq: oFabSpecs[0].ZZSHRQ,
                                            Zzprmo: oFabSpecs[0].PLANMONTH.slice(5,7),
                                            Zzpryr: oFabSpecs[0].PLANMONTH.slice(0,4),
                                            Zzmakt: poitem.ADDTLDESC
                                        })
                                    }
                                }
                            })

                            var vCondVal = me.getView().getModel("discrates").getData().length === 0 ? "" : me.getView().getModel("discrates").getData()[0].OKbetr;
                            var oParamCPOCondData = [{
                                CondType: "RL01",
                                CondValue: vCondVal === "" ? "0" : vCondVal, 
                                Currency: oHeaderData.CURRENCY,
                                CurrencyIso:  oHeaderData.CURRENCY
                            }]

                            oParamCPO["PONumber"] = "";
                            oParamCPO["No_Price_From_PO"] = infoRecCheck ? "" : "X";
                            oParamCPO['N_CreatePOHdrParam'] = oParamCPOHdrData;
                            oParamCPO['N_CreatePOHdrTextParam'] = oParamCPOHdrTextData;
                            oParamCPO['N_CreatePOItemParam'] = oParamCPOItemData;
                            oParamCPO['N_CreatePOItemSchedParam'] = oParamCPOItemSchedData;
                            oParamCPO['N_CreatePOAddtlDtlsParam'] = oParamCPOAddtlDtlsData;
                            oParamCPO['N_CreatePOItemTextParam'] = [];
                            oParamCPO['N_CreatePOCondHdrParam'] = [];
                            oParamCPO['N_CreatePOCondParam'] = oParamCPOCondData;
                            oParamCPO['N_CreatePOClosePRParam'] = oParamCPOClosePRData;
                            oParamCPO['N_CreatePOReturn'] = [];
                                
                            console.log(oParamCPO);
                            oModelRFC.create("/CreatePOSet", oParamCPO, {
                                method: "POST",
                                success: function(oResult, oResponse) {
                                    Common.closeProcessingDialog(me);
                                    console.log(oResult);
                                    var oRetMsgs = oResult.N_CreatePOReturn.results;
                                    var sRetMSg = "";

                                    oRetMsgs.forEach(msg => {
                                        if (msg.Type === "S") {
                                            sRetMSg = msg.Type + ": " + msg.Message;
                                        }
                                        else if (msg.Type === "E") {
                                            sRetMSg = sRetMSg + msg.Type + ": " +  msg.Message + "\r\n";
                                        }
                                    })

                                    if (oRetMsgs[0].Type === "S") {
                                        me.savePOTolerance(sPONo);
                                        me._resMessage = sRetMSg + "\r\n";

                                        //update original PO
                                        //show message after update
                                        me.updateOriginalPO();
                                    }
                                    else {
                                        MessageBox.error(me.getView().getModel("ddtext").getData()["INFO_ERROR"] + "\r\n" + sRetMSg);
                                    }
                                },
                                error: function(err) {
                                    Common.closeProcessingDialog(me);
                                    MessageBox.error(me.getView().getModel("ddtext").getData()["INFO_ERROR"] + " " + err.message);
                                }
                            });
                        },
                        error: function(err) {
                            Common.closeProcessingDialog(me);
                            MessageBox.error(me.getView().getModel("ddtext").getData()["INFO_ERROR"] + " " + err.message);
                        }
                    });
                },
                error: function (err) { 
                    Common.closeProcessingDialog(me);
                    MessageBox.error(me.getView().getModel("ddtext").getData()["INFO_ERROR"] + " " + err.message);
                }
            });
        },

        onCancelPO: function(oEvent) {
            var oData = {
                Process: "splitpo-cancel",
                Text: this.getView().getModel("ddtext").getData()["CONF_CANCEL_TRANS"]
            }

            if (!this._ConfirmDialog) {
                this._ConfirmDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.ConfirmDialog", this);

                this._ConfirmDialog.setModel(new JSONModel(oData));
                this.getView().addDependent(this._ConfirmDialog);
            }
            else this._ConfirmDialog.setModel(new JSONModel(oData));
                
            this._ConfirmDialog.open();
        },

        handlesuggestionItemSelected: function(oEvent) {
            oEvent.getSource().setDescription("test");    
        },

        getPOTolerance(arg1, arg2) {
            var me = this;
            var oModelRFC = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
            var oHeaderData = this.getView().getModel("VPOSplitHdr").getData();
            var oDetailData = arg2;            
            var sVendor = oHeaderData.VENDOR;

            if (!isNaN(sVendor)) {
                while (sVendor.length < 10) sVendor = "0" + sVendor;
            }

            var oParam = {
                IV_DOCTYPE: oHeaderData.DOCTYPE,
                IV_VENDOR: sVendor,
                IV_PRNUMBER: oDetailData.PRNO,
                IV_PRITEM: oDetailData.PRITM,
                IV_POQTY: oDetailData.SPLITPOQTY
            }

            oModelRFC.create("/Get_POTolSet", oParam, {
                method: "POST",
                success: function(oData, oResponse) {
                    var sRowPath = arg1;

                    if ((oData.RETURN + "") !== "4") {
                        oDetailData.OVERDELTOL = (+oData.EV_UEBTO).toFixed(1);
                        oDetailData.UNDERDELTOL = (+oData.EV_UNTTO).toFixed(1);
                        oDetailData.UNLIMITED = oData.EV_UNLI === "" ? false : true;
                        
                        if (me._oParamCPOTolData.filter(fItem => fItem.EBELP === oDetailData.ITEM).length > 0) {
                            me._oParamCPOTolData.forEach((item, index) => {
                                if (item.EBELP === oDetailData.ITEM) {
                                    me._oParamCPOTolData[index].TOLALLOWEDIT = oData.EV_ALLOWEDIT;
                                    me._oParamCPOTolData[index].QTYMIN = oData.EV_QTYMIN;
                                    me._oParamCPOTolData[index].QTYMAX = oData.EV_QTYMAX;
                                    me._oParamCPOTolData[index].UNTTOMIN = oData.EV_UNTTOMIN;
                                    me._oParamCPOTolData[index].UNTTOMAX = oData.EV_UNTTOMAX;
                                    me._oParamCPOTolData[index].UEBTOMIN = oData.EV_UEBTOMIN;
                                    me._oParamCPOTolData[index].UEBTOMAX = oData.EV_UEBTOMAX;
                                }
                            })                            
                        }
                        else {
                            me._oParamCPOTolData.push({
                                EBELN: "",
                                EBELP: oDetailData.ITEM,
                                WEMNG: "0",
                                FOCQTY: "0",
                                TOLALLOWEDIT: oData.EV_ALLOWEDIT,
                                QTYMIN: oData.EV_QTYMIN,
                                QTYMAX: oData.EV_QTYMAX,
                                UNTTOMIN: oData.EV_UNTTOMIN,
                                UNTTOMAX: oData.EV_UNTTOMAX,
                                UEBTOMIN: oData.EV_UEBTOMIN,
                                UEBTOMAX: oData.EV_UEBTOMAX,
                            })
                        }
                    }
                    else {
                        if (me._oParamCPOTolData.filter(fItem => fItem.EBELP === oDetailData.ITEM).length > 0) {
                            me._oParamCPOTolData.forEach((item, index) => {
                                if (item.EBELP === oDetailData.ITEM) {
                                    me._oParamCPOTolData.splice(index, 1);

                                    //put back original data
                                    var oOrigDtlData = me._oData.detail.filter(fItem => fItem.ITEM === oDetailData.ITEM);

                                    oDetailData.OVERDELTOL = oOrigDtlData[0].OVERDELTOL;
                                    oDetailData.UNDERDELTOL = oOrigDtlData[0].UNDERDELTOL;
                                    oDetailData.UNLIMITED = oOrigDtlData[0].UNLI;
                                }
                            })
                        }
                    }
                },
                error: function (err) { }
            })
        },

        savePOTolerance(arg) {
            this._oModel.setUseBatch(true);
            this._oModel.setDeferredGroups(["update"]);

            var sPONo = arg;
            var mParameters = { groupId:"update" }

            this._oParamCPOTolData.forEach(item => item.EBELN = sPONo);

            this.getView().getModel("VPOSplitDtl").getData().forEach(item => {
                if (this._oParamCPOTolData.filter(fItem => fItem.EBELP === item.ITEM).length === 0) {
                    this._oParamCPOTolData.push({
                        EBELN: sPONo,
                        EBELP: item.NEWITEM,
                        WEMNG: this._oDataPOTolerance.WEMNG,
                        FOCQTY: this._oDataPOTolerance.FOCQTY,
                        TOLALLOWEDIT: this._oDataPOTolerance.TOLALLOWEDIT,
                        QTYMIN: this._oDataPOTolerance.QTYMIN,
                        QTYMAX: this._oDataPOTolerance.QTYMAX,
                        UNTTOMIN: this._oDataPOTolerance.UNTTOMIN,
                        UNTTOMAX: this._oDataPOTolerance.UNTTOMAX,
                        UEBTOMIN: this._oDataPOTolerance.UEBTOMIN,
                        UEBTOMAX: this._oDataPOTolerance.UEBTOMAX,
                    })                    
                }
            })

            this._oParamCPOTolData.forEach(tol => {
                this._oModel.create("/PODataSet", tol, mParameters);
            })

            this._oModel.submitChanges({
                groupId: "update",
                success: function (oData, oResponse) { },
                error: function () { }
            }) 
        },

        updateOriginalPO() {
            //call po change rfc
            var me = this;
            var oModel = me.getOwnerComponent().getModel();
            var oModelRFC = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
            var oHeaderData = this._oData.header;
            var oDetailData = this._oData.detail;
            var oDetailChangeData = this.getView().getModel("VPOSplitDtl").getData();

            var oItemParam = [], oCloseParam = [];

            var oParam = {
                IPoNumber: oHeaderData.PONO,
                IDoDownload: "N",
                IChangeonlyHdrplants: "N"
            }

            oDetailChangeData.forEach(item => {
                var oItem = oDetailData.filter(fItem => fItem.ITEM === item.ITEM);

                oItemParam.push({
                    Banfn: oItem[0].PRNO, //PRNO
                    Bnfpo: oItem[0].PRITM, //PRITM
                    Ebeln: oHeaderData.PONO,//pono
                    Unsez: oHeaderData.SHIPTOPLANT, //shipToPlant
                    Inco1: oHeaderData.INCOTERMS, // Incoterms
                    Inco2: oHeaderData.DEST, //Destination
                    Evers: oHeaderData.SHIPMODE, //ShipMode
                    Ebelp: oItem[0].ITEM,//poitem
                    Txz01: oItem[0].SHORTTEXT,//shorttext
                    Menge: item.POQTY - item.SPLITPOQTY,//QTY
                    Meins: oItem[0].UOM,//UOM
                    Netpr: oItem[0].NETPRICE,//net price
                    Peinh: oItem[0].PER,//PER
                    Bprme: oItem[0].ORDERPRICEUOM, //Order Price Unit
                    Repos: oItem[0].INVRCPTIND, //IR Indicator
                    Webre: oItem[0].GRBASEDIVIND, //GR Based Ind
                    Eindt: sapDateFormat.format(new Date(oItem[0].DELDT)) + "T00:00:00", //DlvDt
                    Uebtk: oItem[0].UNLIMITED,//Unlimited
                    Uebto: oItem[0].OVERDELTOL,//OverDel Tol.
                    Untto: oItem[0].UNDERDELTOL,//UnderDel Tol.
                    Zzmakt: oItem[0].POADDTLDESC, //PO Addtl Desc
                    Elikz: oItem[0].CLOSED, //Closed                    
                });

                oCloseParam.push({
                    Banfn: oItem[0].PRNO, //PRNO
                    Bnfpo: oItem[0].PRITM, //PRITM
                    Ebakz: "" 
                });
            })

            oParam['N_ChangePOItemParam'] = oItemParam;
            oParam['N_ChangePOClosePRParam'] = oCloseParam;
            oParam['N_ChangePOReturn'] = [];
            console.log(oParam)
            oModelRFC.create("/ChangePOSet", oParam, {
                method: "POST",
                success: function(oData, oResponse) {
                    message = ""

                    if (oData.N_ChangePOReturn.results.length > 0) {
                        var oParam = {};

                        for (var errCount = 0; errCount <= oData.N_ChangePOReturn.results.length - 1; errCount++) {
                            message =+ oData.N_ChangePOReturn.results[errCount] === undefined ? "": oData.N_ChangePOReturn.results[errCount].Msgv1;

                            if (oData.N_ChangePOReturn.results[errCount].Msgtyp === 'S') {
                                oModel.read('/VPOCurrentRelGrpStatSet', {
                                    urlParameters: {
                                        "$filter": "EBELN eq '" + oHeaderData.PONO + "'"
                                    },
                                    success: function (data, response) {
                                        if ((oHeaderData.EDIVENDOR === "L" ? true : false) && (data.results[0].FRGGR === me.getView().getModel("relstrat").getData().RELGRP) && (data.results[0].FRGSX === me.getView().getModel("relstrat").getData().RELSTRAT) && (data.results[0].FRGKE === "1")) {
                                            MessageBox.confirm("PO has been changed but release was not reset. Do you want this PO downloaded to the vendor?", {
                                                actions: ["Yes", "No"],
                                                onClose: function (sAction) {
                                                    if (sAction === "Yes") {
                                                        oParam = {
                                                            "EBELN": oHeaderData.PONO,
                                                            "EDI": "X",
                                                            "DOWNLOAD": ""
                                                        }

                                                        var oEntitySet = "/VPODownloadedSet(EBELN='" + oHeaderData.PONO + "')";

                                                        oModel.update(oEntitySet, oParam, {
                                                            method: "PUT",
                                                            success: function (data, oResponse) {
                                                                me.downloadPO(oParam);
                                                            },
                                                            error: function (err) { }
                                                        });
                                                    }
                                                    else {
                                                        oParam = {
                                                            "EBELN": me._pono,
                                                            "EDI": "X",
                                                            "DOWNLOAD": "N"
                                                        }

                                                        me.downloadPO(oParam);
                                                    }
                                                }
                                            });
                                        }
                                        else if ((oHeaderData.EDIVENDOR !== "L" ? "1" : "0") && (data.results[0].FRGGR === me.getView().getModel("relstrat").getData().RELGRP) && (data.results[0].FRGSX === me.getView().getModel("relstrat").getData().RELSTRAT) && (data.results[0].FRGKE === "1")) {
                                            oParam = {
                                                "EBELN": oHeaderData.PONO,
                                                "EDI": "",
                                                "DOWNLOAD": "N"
                                            }

                                            me.downloadPO(oParam);
                                        }
                                    }
                                });                                
                            }
                        }

                        me._resMessage += message;
                    }

                    me.getOwnerComponent().getModel("UI_MODEL").setProperty("/refresh", true);

                    MessageBox.information(me._resMessage, {
                        onClose: function(oAction) { 
                            me.navBack();
                        }
                    })                    
                },
                error: function(error) {
                    MessageBox.information(me._resMessage += error.message, {
                        onClose: function(oAction) {
                            me.navBack();
                        }
                    })
                }
            })            
        },

        downloadPO(oParam) {
            this._oModel.create("/VPODownloadedSet", oParam, {
            method: "POST",
            success: function (oResult, oResponse) { }
            });
        },

        navBack() {
            //unlock PO
            this.onPOUnlock();

            //navback
            var oHistory, sPreviousHash;

            if (sap.ui.core.routing.History !== undefined) {
                oHistory = sap.ui.core.routing.History.getInstance();
                sPreviousHash = oHistory.getPreviousHash();
            }

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else { 
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("vendorpodetail", {}, true /*no history*/);
            }
        },

        formatValueHelp: function(sValue, sPath, sKey, sText, sFormat) {
            var oValue = this.getView().getModel(sPath).getData().filter(v => v[sKey] === sValue);

            if (oValue && oValue.length > 0) {
                if (sFormat === "Value") {
                    return oValue[0][sText];
                }
                else if (sFormat === "ValueKey") {
                    return oValue[0][sText] + " (" + sValue + ")";
                }
                else if (sFormat === "KeyValue") {
                    return sValue + " (" + oValue[0][sText] + ")";
                }
                else {
                    return sValue;
                }
            }
            else return sValue;

            // return sValue;
        },

        handleFormValueHelp: function (oEvent) {
            TableValueHelp.handleFormValueHelp(oEvent, this);
        },

        onFormValueHelpInputChange: function(oEvent) {
            var me = this;
            var oSource = oEvent.getSource();
            var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
            oSource.setValueState(isInvalid ? "Error" : "None");

            // oSource.getSuggestionItems().forEach(item => {
            //     if (item.getProperty("key") === oSource.getValue().trim()) {
            //         isInvalid = false;
            //         oSource.setValueState(isInvalid ? "Error" : "None");
            //     }
            // })

            oSource.getSuggestionItems().forEach(item => {
                if (oSource.getSelectedKey() === "" && oSource.getValue() !== "") {
                    if (oSource.getProperty("textFormatMode") === "ValueKey" && ((item.getProperty("text") + " (" + item.getProperty("key") + ")") === oSource.getValue())) {
                        oSource.setSelectedKey(item.getProperty("key"));
                        isInvalid = false;
                        oSource.setValueState(isInvalid ? "Error" : "None");
                    }
                    else if ((oSource.getProperty("textFormatMode") === "Value" || oSource.getProperty("textFormatMode") === "Key") && (item.getProperty("key") === oSource.getValue())) {
                        oSource.setSelectedKey(item.getProperty("key"));
                        isInvalid = false;
                        oSource.setValueState(isInvalid ? "Error" : "None");
                    }
                }
                else if (item.getProperty("key") === oSource.getSelectedKey()) {
                    isInvalid = false;
                    oSource.setValueState(isInvalid ? "Error" : "None");
                }
            })

            if (isInvalid) this._validationErrors.push(oEvent.getSource().getId());
            else {
                var sModel = oSource.getBindingInfo("value").parts[0].model;
                var sPath = oSource.getBindingInfo("value").parts[0].path;

                this.getView().getModel(sModel).setProperty(sPath, oSource.getSelectedKey());

                this._validationErrors.forEach((item, index) => {
                    if (item === oEvent.getSource().getId()) {
                        this._validationErrors.splice(index, 1);
                    }
                })

                if (sPath === "/PURCHORG") {
                    if (oSource.getSelectedKey() === "") {
                        this.byId("splitPOVendor").setEnabled(false);
                    }
                    else {
                        this.byId("splitPOVendor").setEnabled(true);
                        this.getView().getModel("VPOSplitHdr").setProperty("/VENDOR", "");

                        var oHeaderData = this.getView().getModel("VPOSplitHdr").getData();
                        var oOrigHeaderData = this._oData.header;

                        this._oModel.read("/VPOSplitVendorRscSet", {
                            urlParameters: {
                                "$filter": "REQPLANTCD eq '" + oHeaderData.SHIPTOPLANT + "' and EKORG eq '" + oHeaderData.PURCHORG + "' and LIFNR eq '" + oOrigHeaderData.VENDOR + "'"
                            },
                            success: function (oData, oResponse) {
                                console.log(oData.results)
                                me.getView().setModel(new JSONModel(oData.results), "vendor");
                            },
                            error: function (err) { }
                        });
                    }
                }
                else if (sPath === "/VENDOR") {
                    // var oVendor = this.getView().getModel("vendor").getData().filter(fItem => fItem.LIFNR === oSource.getSelectedKey());
                    var oVendor = this.getView().getModel("vendor").getData().filter((fItem, fIndex) => fIndex === +this._selValueHelpIndex);

                    if (oVendor.length > 0) {
                        this.getView().getModel("VPOSplitHdr").setProperty("/CURRENCY", oVendor[0].WAERS);
                        this.getView().getModel("VPOSplitHdr").setProperty("/PURCHPLANT", oVendor[0].PURPLANTCD);
                        this.getView().getModel("VPOSplitHdr").setProperty("/DEST", oVendor[0].INCO2);
                        this.getView().getModel("VPOSplitHdr").setProperty("/COMPANY", oVendor[0].COMPANYCD);

                        if (this.getView().getModel("payterms").getData().filter(fItem => fItem.ZTERM === oVendor[0].ZTERM).length === 0) {
                            this.getView().getModel("VPOSplitHdr").setProperty("/PAYMNTTERMS", "");
                        }
                        else {
                            this.getView().getModel("VPOSplitHdr").setProperty("/PAYMNTTERMS", oVendor[0].ZTERM);
                            this.byId("splitPOPayTerms").setValueState("None");
                        }

                        if (this.getView().getModel("incoterms").getData().filter(fItem => fItem.INCOTERMS === oVendor[0].INCO1).length === 0) {
                            this.getView().getModel("VPOSplitHdr").setProperty("/INCOTERMS", "");
                        }
                        else {
                            this.getView().getModel("VPOSplitHdr").setProperty("/INCOTERMS", oVendor[0].INCO1);
                            this.byId("splitPOIncoTerms").setValueState("None");
                        }

                        if (oVendor[0].INCO2 !== "") {
                            this.byId("splitPODest").setValueState("None");
                        }
                    }
                }
            }

            this._bHeaderChanged = true;
        },

        onTableClick(oEvent) {
            var oControl = oEvent.srcControl;
            var sTabId = oControl.sId.split("--")[oControl.sId.split("--").length - 1];

            while (sTabId.substr(sTabId.length - 3) !== "Tab") {                    
                oControl = oControl.oParent;
                sTabId = oControl.sId.split("--")[oControl.sId.split("--").length - 1];
            }
            
            this._sActiveTable = sTabId;
        },

        onKeyDown(oEvent) {           
            if (this._headerTextDialog) {
                if (oEvent.key.toUpperCase() === "ENTER") {
                    if (oEvent.srcControl.sParentAggregationName === "cells" && (this._sActiveTable === "remarksTab" || this._sActiveTable === "packinsTab")) { this.onAddHdrTxt(); }
                }
                else if (oEvent.ctrlKey && oEvent.key.toUpperCase() === "I") {
                    this.onAddHdrTxt();
                }
                else if (oEvent.ctrlKey && oEvent.key.toUpperCase() === "S") {
                    this.onSaveHdrTxt();
                }
                else if (oEvent.ctrlKey && oEvent.key.toUpperCase() === "D") {
                    oEvent.preventDefault();
                    this.onDeleteHdrTxt();
                }
                else if (oEvent.ctrlKey && oEvent.key.toUpperCase() === "X") {
                    this.onCloseHdrTxt();
                }
            }
            else if (this._changeDateDialog) {
                if (oEvent.key.toUpperCase() === "ENTER") {
                    this.onSaveChangeVPODelvDate();
                }
                else if (oEvent.ctrlKey && oEvent.key.toUpperCase() === "X") {
                    this.onCancelChangeVPODelvDate();
                }
            }
        },
        
        onInputKeyDown(oEvent) {
            if (oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") {
                //prevent increase/decrease of number value
                oEvent.preventDefault();

                var sTableId = oEvent.srcControl.oParent.oParent.sId;
                // var oTable = this.byId(sTableId);
                var oTable = sap.ui.getCore().byId(sTableId);
                var sColumnName = oEvent.srcControl.getBindingInfo("value").parts[0].path;
                var sCurrentRowIndex = -1;
                var sColumnIndex = -1;
                var sCurrentRow = -1;
                var sNextRow = -1;
                var sActiveRow = -1;
                var iFirstVisibleRowIndex = oTable.getFirstVisibleRow();
                var iVisibleRowCount = oTable.getVisibleRowCount();
                var iRowCount = 0;

                if (this._headerTextDialog) {
                    var activeTab = sap.ui.getCore().byId("ITB1").getSelectedKey();

                    if (activeTab === "remarks") {
                        iRowCount = this._oHeaderTextDialog.getModel().getData().rem_items.length;
                        sCurrentRowIndex = +oEvent.srcControl.oParent.getBindingContext().sPath.replace("/rem_items/", "");
                        this._oHeaderTextDialog.getModel().setProperty(oEvent.srcControl.oParent.getBindingContext().sPath + "/REMARKS", oEvent.srcControl.getValue());
                    }
                    else if (activeTab === "packins") {
                        iRowCount = this._oHeaderTextDialog.getModel().getData().packins_items.length;
                        sCurrentRowIndex = +oEvent.srcControl.oParent.getBindingContext().sPath.replace("/packins_items/", "");
                        this._oHeaderTextDialog.getModel().setProperty(oEvent.srcControl.oParent.getBindingContext().sPath + "/PACKINS", oEvent.srcControl.getValue());
                    }
                }
                else {
                    iRowCount = oTable.getModel("detail").getData().length;
                    sCurrentRowIndex = +oEvent.srcControl.oParent.getBindingContext("detail").sPath.replace("/", "");
                    oTable.getModel("detail").setProperty(oEvent.srcControl.oParent.getBindingContext("detail").sPath + "/" + oEvent.srcControl.getBindingInfo("value").parts[0].path, oEvent.srcControl.getValue());
                }

                //get active row (arrow down)
                oTable.getBinding("rows").aIndices.forEach((item, index) => {
                    if (item === sCurrentRowIndex) { sCurrentRow = index; }
                    if (sCurrentRow !== -1 && sActiveRow === -1) { 
                        if ((sCurrentRow + 1) === index) { sActiveRow = item }
                        else if ((index + 1) === oTable.getBinding("rows").aIndices.length) { sActiveRow = item }
                    }
                })
                
                //get next row to focus and active row (arrow up)
                if (oEvent.key === "ArrowUp") { 
                    if (sCurrentRow !== 0) {
                        sActiveRow = oTable.getBinding("rows").aIndices.filter((fItem, fIndex) => fIndex === (sCurrentRow - 1))[0];
                    }
                    else { sActiveRow = oTable.getBinding("rows").aIndices[0] }

                    sCurrentRow = sCurrentRow === 0 ? sCurrentRow : sCurrentRow - iFirstVisibleRowIndex;
                    sNextRow = sCurrentRow === 0 ? 0 : sCurrentRow - 1;
                }
                else if (oEvent.key === "ArrowDown") { 
                    sCurrentRow = sCurrentRow - iFirstVisibleRowIndex;
                    sNextRow = sCurrentRow + 1;
                }

                //auto-scroll up/down
                if (oEvent.key === "ArrowDown" && (sNextRow + 1) < iRowCount && (sNextRow + 1) > iVisibleRowCount) {
                    oTable.setFirstVisibleRow(iFirstVisibleRowIndex + 1);
                }   
                else if (oEvent.key === "ArrowUp" && sCurrentRow === 0 && sNextRow === 0 && iFirstVisibleRowIndex !== 0) { 
                    oTable.setFirstVisibleRow(iFirstVisibleRowIndex - 1);
                }

                //get the cell to focus
                oTable.getRows()[sCurrentRow].getCells().forEach((cell, index) => {
                    if (cell.getBindingInfo("value") !== undefined) {
                        if (cell.getBindingInfo("value").parts[0].path === sColumnName) { sColumnIndex = index; }
                    }
                })
                
                if (oEvent.key === "ArrowDown") {
                    sNextRow = sNextRow === iVisibleRowCount ? sNextRow - 1 : sNextRow;
                }

                //set focus on cell
                setTimeout(() => {
                    oTable.getRows()[sNextRow].getCells()[sColumnIndex].focus();
                    oTable.getRows()[sNextRow].getCells()[sColumnIndex].getFocusDomRef().select();
                }, 100);
            }
        },

        onPOUnlock: function() {
            var oModelLock = this.getOwnerComponent().getModel("ZGW_3DERP_LOCK2_SRV");
            var oHeaderData = this._oData.header;

            var aParamLockPOdata = [{
                Pono: oHeaderData.PONO
            }];

            var oParam = {
                "N_UNLOCK_PO_ITEMTAB": aParamLockPOdata,
                "N_UNLOCK_PO_ENQ": [], 
                "N_UNLOCK_PO_MESSAGES": [] 
            };

            oModelLock.create("/Unlock_POHdr_Set", oParam, {
                method: "POST",
                success: function(oData, oResponse) { },
                error: function(err) { }
            });
        },

    })
})