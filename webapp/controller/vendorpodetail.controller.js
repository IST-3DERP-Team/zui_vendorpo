sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/Filter',
    // "../js/Common",
    // "../js/Utils",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    'sap/m/MessageToast',
    'jquery.sap.global',
    'sap/ui/core/routing/HashChanger',
    "../js/Utils",
    'sap/m/Token',
    "../js/Common",
    "../js/TableFilter",
    "../js/TableValueHelp"

],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Filter, JSONModel, MessageBox, MessageToast, jQuery, HashChanger, Utils, Token, Common, TableFilter, TableValueHelp) {
        "use strict";

        var that;
        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
        var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });
        var getMonth = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM" });
        var getYear = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy" });


        var timeFormat = sap.ui.core.format.DateFormat.getTimeInstance({pattern: "KK:mm:ss a"}); 
        var TZOffsetMs = new Date(0).getTimezoneOffset()*60*1000;
        var _promiseResult;
        var _withGR;
        var _captionList = [];

        return Controller.extend("zuivendorpo.controller.vendorpodetail", {

            onInit: async function () {
                that = this;

                //Initialize router
                var _oComponent = this.getOwnerComponent();
                this._router = _oComponent.getRouter();
                
                this._router.getRoute("vendorpodetail").attachPatternMatched(this._routePatternMatched, this);

                this._columnLoadError = false;
                this._oDataBeforeChange = []
                this._oDataRemarksBeforeChange = {}
                this._oDataPkgInstBeforeChange = {}

                this._headerIsEdited = false;
                this._isEdited = false
                this._DiscardChangesDialog = null;
                this._validationErrors = [];
                this._validPOChange;

                //Vendor Change
                this._purchOrg;
                this._purchGrp;
                this._vendorCd;
                this._newVendorCd;
                this._newDlvDate;

                //Table Filter
                this._aColumns = {};
                this._tableFilter = TableFilter;
                this._colFilters = {};

                //Table Valuehelp
                this._tableValueHelp = TableValueHelp; 
			    this._tblColumns = {};
                
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_VPO_FILTERS_CDS");
                this.getView().setModel(oModel);

                //On Key Up delegate
                var _oDelegateKeyUp = {
                    onkeyup: function(oEvent){
                        that.onKeyUp(oEvent);
                    }
                };
                this.byId("vpoDetailsTab").addEventDelegate(_oDelegateKeyUp);
                this.byId("vpoDelSchedTab").addEventDelegate(_oDelegateKeyUp);
                this.byId("vpoDelInvTab").addEventDelegate(_oDelegateKeyUp);
                this.byId("vpoPoHistTab").addEventDelegate(_oDelegateKeyUp);
                this.byId("vpoConditionsTab").addEventDelegate(_oDelegateKeyUp);
                this.byId("vpoReceiptsIssuancesTab").addEventDelegate(_oDelegateKeyUp);

                
                //Initialize translations
                this._i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                this.getView().setModel(new JSONModel({
                    dataMode: 'NODATA',
                    activePONo: '',
                    activePOItem: '',
                    activeCondRec: '',
                    condMatNo: '',
                    condShortText: '',
                    totalCondValue: 0,
                    poVendorVendName: '',
                    ifZfab: false
                }), "ui");

                // this.getView().setModel(new JSONModel(), "VisibleFieldsData");
                this.getView().setModel(new JSONModel(), "EditableFieldsData");

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
                
                this.getView().setModel(new JSONModel(nodeLanes), "vpoProcessFlow");

                this.updUnlock = 1;
                this.zpoUnlock = 1;
                this.ediVendor; 
                this.mattyp = 0;
                this.updateZERPPOUnlock();

                this._tableFullScreenRender = "";

                //store PO Item/MatNo/ShortText for Condition Record arrow up and arrow down function
                this._condPOItemMatNoStore = []; //Store PO Items and Material No. 
                this._condPOItemCount = 0; //Store Count every time user click arrow button in Condition Table

                //store PO Item for PO History arrow up and arrow down function
                this._poItemStore = []; //Store PO Items. 
                this._poHistPOItemCount = 0; //Store Count every time user click arrow button in PO History
                this._procFlowPOItemCount = 0; //Store Count every time user click arrow button in PO Proccess Flow

                //Change MatNo- Stores Selected PO Det Data to get the MatTyp when processing change Material
                this._storePODetChangeMatNo = [];

                //Store 

                this._appAction = "" //global variable of Application Action if Display or Change
                await this.getAppAction(); //Get the Application actions if Display or Change in LTD

                if(this._appAction === "display"){
                    this.byId("vpoHdrMenuBtn").setVisible(false);
                    this.byId("vpoBtnEditHeader").setVisible(false);

                    this.byId("vpoNewHdrTxtRemarks").setVisible(false);
                    this.byId("vpoEditHdrTxtRemarks").setVisible(false);
                    this.byId("vpoDeleteHdrTxtRemarks").setVisible(false);

                    this.byId("vpoNewHdrTxtPkgInst").setVisible(false);
                    this.byId("vpoEditHdrTxtPkgInst").setVisible(false);
                    this.byId("vpoDeleteHdrTxtPkgInst").setVisible(false);

                    this.byId("vpoBtnAddPRtoPO").setVisible(false);
                    this.byId("vpoBtnItemChanges").setVisible(false);
                    this.byId("vpoBtnEditDetails").setVisible(false);
                    this.byId("vpoBtnDeleteDetails").setVisible(false);
                    this.byId("vpoBtnSaveLayoutDetails").setVisible(false);

                    this.byId("vpoBtnLineSplit").setVisible(false);
                    this.byId("vpoBtnEditDelSched").setVisible(false);
                    this.byId("vpoBtnDeleteDelSched").setVisible(false);
                    this.byId("vpoBtnSaveLayoutDelSched").setVisible(false);

                    this.byId("vpoBtnEditDelInv").setVisible(false);
                    this.byId("vpoBtnSaveLayoutDelInv").setVisible(false);

                    this.byId("vpoBtnSaveLayoutPOHistory").setVisible(false);
                    this.byId("vpoBtnSaveLayoutConditions").setVisible(false);

                    this.byId("comVpoHdrSave").setEnabled(false);
                    this.byId("comVpoHdrEdit").setEnabled(false);

                    this.byId("comVpoHdrTextRNew").setEnabled(false);
                    this.byId("comVpoHdrTextREdit").setEnabled(false);
                    this.byId("comVpoHdrTextRSave").setEnabled(false);

                    this.byId("comVpoHdrTextPNew").setEnabled(false);
                    this.byId("comVpoHdrTextPEdit").setEnabled(false);
                    this.byId("comVpoHdrTextPSave").setEnabled(false);

                    // Other Info
                    this.byId("mbAddOthInfo").setVisible(false);
                    this.byId("btnEditOthInfo").setVisible(false);
                    this.byId("btnDeleteOthInfo").setVisible(false);

                    this.byId("comVpoDetailsEdit").setEnabled(false);
                    this.byId("comVpoDetailsSave").setEnabled(false);
                }
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
            _routePatternMatched: async function (oEvent) {
                var me = this;
                
                this._pono = oEvent.getParameter("arguments").PONO;
                // this._condrec = oEvent.getParameter("arguments").CONDREC;
                this._sbu = oEvent.getParameter("arguments").SBU;                

                this.getView().getModel("ui").setProperty("/activePONo", this._pono);
                this.getView().getModel("vpoProcessFlow").setProperty("/nodes", []);
                
                //Captions
                await this.callCaptionsAPI();
                this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("CAPTION_MSGS_MODEL").getData().text), "ddtext");

                Common.openLoadingDialog(that);
                await this.loadAllData();

                var chkIfZfab = await this.getView().getModel("ui").getProperty("/ifZfab");
                if(!chkIfZfab){
                    this.byId("vpoHeaderTxtFabSpecsTab").setVisible(false);
                }else{
                    this.byId("vpoHeaderTxtFabSpecsTab").setVisible(true);
                }
                
                // var oTable = this.byId("vpoDetailsTab");
                // _promiseResult = new Promise((resolve, reject)=>{
                //     oTable.getRows().forEach(row => {
                //         console.log(row.getBindingContext().sPath.replace("/rows/", ""))
                //         if(row.getBindingContext().sPath.replace("/rows/", "") === "0"){
                //             oTable.setSelectedIndex(parseInt(0));
                //             // resolve(row.addStyleClass("activeRow"));
                //         }
                //     });
                // });

                // this.getColorsTable();

                // //Load value helps
                // Utils.getStyleSearchHelps(this);
                // Utils.getAttributesSearchHelps(this);
                // Utils.getProcessAttributes(this);

                // //Attachments
                // this.bindUploadCollection();
                // this.getView().getModel("FileModel").refresh();
                var poItem = this.getView().getModel("ui").getProperty("/activePOItem"); 
                await this.getProcessFlow(poItem);

                this.onInitOtherInfo();

                Common.closeLoadingDialog(that);
            },

            loadAllData: async function(){
                await this.onSuggestionItems(); //Load Suggestion Items in Header
                await this.getColumnProp();
                // //Load header
                await this.getHeaderData(); //get header data

                await this.onLoadFabSpecsData();
                this.loadReleaseStrategy();

                await this.getMain();
                
                await this.getCols();
                
                var poItem = this.getView().getModel("ui").getProperty("/activePOItem"); 
                this.getProcessFlow(poItem);
                this.hdrTextLoadCol();
                await this.pkngInstTblLoad();

                await this.remarksTblLoad();

                this.getView().getModel("ui").setProperty("/dataMode", 'READ');

                // var oTable = this.byId("vpoDetailsTab");
                // _promiseResult = new Promise((resolve, reject)=>{
                //     oTable.getRows().forEach(row => {
                //         console.log(row.getBindingContext().sPath.replace("/rows/", ""))
                //         if(row.getBindingContext().sPath.replace("/rows/", "") === "0"){
                //             oTable.setSelectedIndex(parseInt(0));
                //         }
                //     });
                // });
                // await _promiseResult;

                return true;
            },
            callCaptionsAPI: async function(){
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
                oDDTextParam.push({CODE: "NEW"});
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
                oDDTextParam.push({CODE: "OTHERINFO"});
                oDDTextParam.push({CODE: "DLVCOMPLETE"});
                oDDTextParam.push({CODE: "UPDATEPRICE"});

                oDDTextParam.push({CODE: "POACTIONS"});
                oDDTextParam.push({CODE: "CHANGEDELVDATE"});
                oDDTextParam.push({CODE: "CHANGEVENDOR"});
                oDDTextParam.push({CODE: "DELETEPO"});
                // oDDTextParam.push({CODE: "CANCELPO"});
                oDDTextParam.push({CODE: "SPLITPO"});

                oDDTextParam.push({CODE: "PODATE"});
                oDDTextParam.push({CODE: "PURCHORG"});
                oDDTextParam.push({CODE: "PURCHGRP"});
                oDDTextParam.push({CODE: "PURCHPLANT"});
                oDDTextParam.push({CODE: "CURRENCY"});
                oDDTextParam.push({CODE: "PAYMNTTERMS"});
                oDDTextParam.push({CODE: "INCOTERMS"});
                oDDTextParam.push({CODE: "DESTINATION"});
                oDDTextParam.push({CODE: "SHIPMODE"});
                oDDTextParam.push({CODE: "RELSTAT"});

                oDDTextParam.push({CODE: "RELGRP"});
                oDDTextParam.push({CODE: "EXPECTEDREL"});
                oDDTextParam.push({CODE: "RELCD"});
                oDDTextParam.push({CODE: "RELIND"});
                oDDTextParam.push({CODE: "RELTODT"});

                oDDTextParam.push({CODE: "REMARKS"});
                oDDTextParam.push({CODE: "PACKINSTRUCT"});

                // Other Info
                oDDTextParam.push({CODE: "MANUAL"});
                oDDTextParam.push({CODE: "COPYDEFAULT"});
                oDDTextParam.push({CODE: "CONSIGNEENAME"});
                oDDTextParam.push({CODE: "COMPANYNAME"});
                oDDTextParam.push({CODE: "COMPANYADDR"});
                oDDTextParam.push({CODE: "TELNO"});
                oDDTextParam.push({CODE: "FAXNO"});
                oDDTextParam.push({CODE: "CURRENCY"});
                oDDTextParam.push({CODE: "FINCONTNAME"});
                oDDTextParam.push({CODE: "FINCONTNO"});
                oDDTextParam.push({CODE: "WHSECONTNAME"});
                oDDTextParam.push({CODE: "WHSECONTNO"});
                oDDTextParam.push({CODE: "WHSECONTADDR"});
                oDDTextParam.push({CODE: "DISCVAT"});
                oDDTextParam.push({CODE: "ORDERUOM"});
                oDDTextParam.push({CODE: "CREATEDBY"});
                oDDTextParam.push({CODE: "CREATEDDT"});

                oDDTextParam.push({CODE: "ADDPRTOPO"});
                oDDTextParam.push({CODE: "ITEMCHANGES"});
                oDDTextParam.push({CODE: "LINESPLIT"});

                oDDTextParam.push({CODE: "INFO_DISCARD_CHANGES"});
                oDDTextParam.push({CODE: "YES"});
                oDDTextParam.push({CODE: "CANCEL"});

                oDDTextParam.push({CODE: "INFO_NO_DATA_EDIT"});
                oDDTextParam.push({CODE: "INFO_NO_DATA_DELETE"});
                
                oDDTextParam.push({CODE: "INFO_PO_NOT_VALID_TO_EDIT"});
                oDDTextParam.push({CODE: "INFO_PO_IS_DELETED"});
                oDDTextParam.push({CODE: "INFO_ERROR"});
                oDDTextParam.push({CODE: "INFO_NO_DTLS_TO_SAVE"});
                oDDTextParam.push({CODE: "INFO_NEW_VENDORCD_EMPTY"});
                oDDTextParam.push({CODE: "INFO_DLVDT_EMPTY"});
                oDDTextParam.push({CODE: "INFO_PO_CLOSED_DELETED"});
                oDDTextParam.push({CODE: "CONF_PROCEED_DELETE_VPO"});
                oDDTextParam.push({CODE: "INFO_PO_ALREADY_RELEASED_CANCEL"});
                oDDTextParam.push({CODE: "INFO_PO_NOT_VALID_TO_DELETE"});
                oDDTextParam.push({CODE: "INFO_NO_DTLS_TO_DELETE"});
                oDDTextParam.push({CODE: "CONF_PROCEED_CANCEL_VPO"});
                oDDTextParam.push({CODE: "CANCELPO"});
                oDDTextParam.push({CODE: "INFO_PO_NOT_VALID_TO_CANCEL"});
                oDDTextParam.push({CODE: "INFO_PO_NOT_YET_RELEASED_DELETE"});
                oDDTextParam.push({CODE: "INFO_NO_DTLS_TO_CANCEL"});
                oDDTextParam.push({CODE: "INFO_REQUIRED_FIELD"});
                oDDTextParam.push({CODE: "INFO_PO_LINE_CANNOT_BE_DELETED"});
                oDDTextParam.push({CODE: "LOADING"});
                oDDTextParam.push({CODE: "INFO_PO_INVALID_ADD_PR_TO_PO"});
                oDDTextParam.push({CODE: "INFO_NO_RECORD_SELECT"})
                oDDTextParam.push({CODE: "INFO_NO_DATA_MODIFIED"});
                oDDTextParam.push({CODE: "CONF_PROCEED_DELETE_RECORD"});
                oDDTextParam.push({CODE: "DELETE"});
                oDDTextParam.push({CODE: "SAVELAYOUT"});
                oDDTextParam.push({CODE: "INFO_NO_LAYOUT"});
                oDDTextParam.push({CODE: "INFO_LAYOUT_SAVE"});
                oDDTextParam.push({CODE: "WARN_ADD_NOT_ALLOW"});
                oDDTextParam.push({CODE: "WARN_EDIT_NOT_ALLOW"});
                oDDTextParam.push({CODE: "WARN_DELETE_NOT_ALLOW"});
                oDDTextParam.push({CODE: "INFO_PROCEED_DELETE"});
                oDDTextParam.push({CODE: "CONFIRM_PROCEED_COPYDEFAULT"});

                oDDTextParam.push({CODE: "CREATEDBY"});
                oDDTextParam.push({CODE: "CREATEDDT"});
                oDDTextParam.push({CODE: "UPDATEDDT"});
                oDDTextParam.push({CODE: "FULLSCREEN"});
                oDDTextParam.push({CODE: "EXITFULLSCREEN"});
                oDDTextParam.push({CODE: "EXPORTTOEXCEL"});
                
                oDDTextParam.push({CODE: "PROCFLOW"});

                oDDTextParam.push({CODE: "MATNO"});
                oDDTextParam.push({CODE: "SHORTTEXT"});

                oDDTextParam.push({CODE: "ARROWUP"});
                oDDTextParam.push({CODE: "ARROWDOWN"});
                oDDTextParam.push({CODE: "POPRINT"});

                oDDTextParam.push({CODE: "GENERATEPO"});
                oDDTextParam.push({CODE: "GMCDESC"});
                oDDTextParam.push({CODE: "ADDTLDESC"});
                oDDTextParam.push({CODE: "POADDTLDESC"});
                oDDTextParam.push({CODE: "BATCH"});
                oDDTextParam.push({CODE: "ORIGPOQTY"});
                oDDTextParam.push({CODE: "SPLITPOQTY"});
                oDDTextParam.push({CODE: "UOM"});
                oDDTextParam.push({CODE: "DELDT"});
                oDDTextParam.push({CODE: "NETPRICE"});
                oDDTextParam.push({CODE: "PER"});
                oDDTextParam.push({CODE: "DENOMINATOR"});
                oDDTextParam.push({CODE: "NUMERATOR"});
                oDDTextParam.push({CODE: "ORDERPRICEUOM"});
                oDDTextParam.push({CODE: "TAXCD"});
                oDDTextParam.push({CODE: "SUPPLYTYP"});
                oDDTextParam.push({CODE: "ITEM"});
                oDDTextParam.push({CODE: "UNLIMITED"});
                oDDTextParam.push({CODE: "OVERDELTOL"});
                oDDTextParam.push({CODE: "UNDERDELTOL"});
                oDDTextParam.push({CODE: "PRNO"});
                oDDTextParam.push({CODE: "PRITM"});
                oDDTextParam.push({CODE: "GRBASEDIVIND"});
                oDDTextParam.push({CODE: "INVRCPTIND"});
                oDDTextParam.push({CODE: "REMARKS"});
                oDDTextParam.push({CODE: "HEADERTEXT"});

                oDDTextParam.push({CODE: "YES"});
                oDDTextParam.push({CODE: "NO"});

                oDDTextParam.push({CODE: "INFO_NEXT_DELVDATE"});
                oDDTextParam.push({CODE: "CONTINUE"});
                oDDTextParam.push({CODE: "INFO_DELVDATE_UPDATED"});
                oDDTextParam.push({CODE: "INFO_CHECK_INVALID_ENTRIES"});
                oDDTextParam.push({CODE: "INFO_INPUT_REQD_FIELDS"});
                oDDTextParam.push({CODE: "CONF_DISCARD_CHANGE"});
                oDDTextParam.push({CODE: "CONF_DELETE_RECORDS"});                
                oDDTextParam.push({CODE: "INFO_SEL_RECORD_TO_DELETE"});
                oDDTextParam.push({CODE: "INFO_INPUT_PACKINS"});
                oDDTextParam.push({CODE: "INFO_PACKINS_SAVED"});
                oDDTextParam.push({CODE: "INFO_INPUT_REMARKS"});
                oDDTextParam.push({CODE: "INFO_REMARKS_SAVED"});
                oDDTextParam.push({CODE: "INFO_DATA_DELETED"});
                oDDTextParam.push({CODE: "ERR_INVALID_SPLITPOQTY"});
                oDDTextParam.push({CODE: "INFO_DATA_SAVE"});
                oDDTextParam.push({CODE: "INFO_NO_RECORD_TO_DELETE"});
                oDDTextParam.push({CODE: "INFO_DATA_SAVE"});
                oDDTextParam.push({CODE: "INFO_NO_DETAIL_DATA"});
                oDDTextParam.push({CODE: "CONF_CANCEL_TRANS"});
                oDDTextParam.push({CODE: "INFO_NO_RANGE_CODE"});
                oDDTextParam.push({CODE: "INFO_ERROR"});
                oDDTextParam.push({CODE: "ERR_GETTING_RESOURCES"});
                oDDTextParam.push({CODE: "INFO_INPUT_HDR_REQD_FIELDS"});
                oDDTextParam.push({CODE: "INFO_INPUT_DTL_REQD_FIELDS"});

                oDDTextParam.push({CODE: "FLTRCRIT"});
                oDDTextParam.push({CODE: "OK"});
                oDDTextParam.push({CODE: "CANCEL"});
                oDDTextParam.push({CODE: "CLRFLTRS"});
                oDDTextParam.push({CODE: "REMOVEFLTR"});
                oDDTextParam.push({CODE: "VALUELIST"});
                oDDTextParam.push({CODE: "USERDEF"});
                oDDTextParam.push({CODE: "SEARCH"});

                oDDTextParam.push({CODE: "LOADING"});
                oDDTextParam.push({CODE: "RECEIPTS_ISSUANCES"});
                oDDTextParam.push({CODE: "CHANGEMATNO"});
                

                await new Promise((resolve)=>{
                    oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                        method: "POST",
                        success: function(oData, oResponse) {
                            oData.CaptionMsgItems.results.forEach(item=>{
                                oDDTextResult[item.CODE] = item.TEXT;
                            })
                            _captionList = oDDTextResult;
                            
                            oJSONModel.setData(oDDTextResult);
                            me.getView().setModel(oJSONModel, "captionMsg");
                            me.getOwnerComponent().getModel("CAPTION_MSGS_MODEL").setData({text: oDDTextResult});
                            resolve();
                        },
                        error: function(err) {
                            sap.m.MessageBox.error(_captionList.INFO_ERROR);
                            resolve();
                        }
                    })
                })
            },

            getHeaderData: async function () {
                var me = this;
                var poNo = this._pono;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oJSONEdit = new JSONModel();
                var oJSONMandatory = new JSONModel();
                var oView = this.getView();
                var edditableFields = [];
                var mandatoryFields = [];

                //read Style header data
                
                var entitySet = "/mainSet(PONO='" + poNo + "')"
                await new Promise((resolve, reject) => {
                    oModel.read(entitySet, {
                        success: async function (oData, oResponse) {
                            oData.CREATEDDT = dateFormat.format(new Date(oData.CREATEDDT));
                            oData.UPDATEDDT = dateFormat.format(new Date(oData.UPDATEDDT));
                            if (oData.PODT !== null)
                                oData.PODT = dateFormat.format(new Date(oData.PODT));
                            
                            oJSONModel.setData(oData);
                            for (var oDatas in oData) {
                                //get only editable fields
                                edditableFields[oDatas] = false;
                                mandatoryFields[oDatas] = false;
                            }
                            
                            me._ediVendor = oData.EDIVENDOR;
                            var poVendorVendorName = oData.PONO + " - " + oData.VENDOR + "(" + oData.NAME + ")";
                            me.getView().getModel("ui").setProperty("/poVendorVendName", poVendorVendorName);
                            
                            me.getView().getModel("ui").setProperty("/activeCondRec", oData.CONDREC);
                            if(oData.DOCTYPE === "ZFAB"){
                                me.getView().getModel("ui").setProperty("/ifZfab", true);
                            }else{
                                me.getView().getModel("ui").setProperty("/ifZfab", false);
                            }
                            
                            oJSONEdit.setData(edditableFields);
                            oJSONMandatory.setData(mandatoryFields);
                            //  (oView.getModel("topHeaderData"))
                            
                            oView.setModel(oJSONModel, "topHeaderData");
                            oView.setModel(oJSONEdit, "topHeaderDataEdit");
                            oView.setModel(oJSONMandatory, "topHeaderDataMandatory");

                            resolve();
                            // me.setChangeStatus(false);
                        },
                        error: function () {
                            resolve();
                        }
                    })
                });
                
                await this.getDetailsofHeaderData();
            },

            getDetailsofHeaderData: async function(){
                var me = this;
                var vSBU = this._sbu;
                var filteroModel = this.getOwnerComponent().getModel("ZVB_3DERP_VPO_FILTERS_CDS");
                let iCounter = 0;
                var oView = this.getView();
                var oJSONModel = new JSONModel();

                var topHeaderData = this.getView().getModel("topHeaderData").getData();

                var docTyp = topHeaderData.DOCTYPE;//this.byId("f1DocTyp").getValue().split('-')[0].trim();
                var purchOrg = topHeaderData.PURCHORG;//this.byId("f1PurOrg").getValue().split('-')[0].trim();
                var purchGrp = topHeaderData.PURCHGRP;//this.byId("f1PurGrp").getValue().split('-')[0].trim();
                var company = topHeaderData.COMPANY;//this.byId("f1Company").getValue().split('-')[0].trim();
                var purchPlant = topHeaderData.PURCHPLANT;//this.byId("f1PurPlant").getValue().split('-')[0].trim();
                var shipMode = topHeaderData.SHIPMODE;//this.byId("f1ShipMode").getValue().split('-')[0].trim();

                var topHeaderDataChange = this.getView().getModel("topHeaderData").getData()

                //DocType
                await new Promise((resolve, reject) => {
                    iCounter = 0; 
                    filteroModel.read("/ZVB_3DERP_DOCTYPE_SH", {
                        success: function (oData, oResponse) {
                            for(var item in oData.results){
                                iCounter++;
                                if(oData.results[item].SBU === vSBU){
                                    if(oData.results[item].DocType === docTyp){
                                        topHeaderDataChange.DocTypDesc = " - " + oData.results[item].Description;
                                    }
                                }
                                if(iCounter === oData.results.length){
                                    resolve();
                                }
                            }
                        },
                        error: function (err) { }
                    });
                });

                //Purch Org
                await new Promise((resolve, reject) => {
                    iCounter = 0; 
                    filteroModel.read("/ZVB_3DERP_PURCHORG_SH", {
                        success: function (oData, oResponse) {
                            for(var item in oData.results){
                                iCounter++;
                                if(oData.results[item].PurchOrg === purchOrg){
                                    topHeaderDataChange.PurchOrgDesc = " - " + oData.results[item].Description;
                                }
                                if(iCounter === oData.results.length){
                                    resolve();
                                }
                            }
                        },
                        error: function (err) { }
                    });
                });

                //PurGrp
                await new Promise((resolve, reject) => {
                    iCounter = 0; 
                    filteroModel.read("/ZVB_3DERP_VPO_PURGRP_SH", {
                        success: function (oData, oResponse) {
                            for(var item in oData.results){
                                iCounter++;
                                if(oData.results[item].PURCHGRP === purchGrp){
                                    topHeaderDataChange.PurchGrpDesc = " - " + oData.results[item].DESCRIPTION;
                                }
                                if(iCounter === oData.results.length){
                                    resolve();
                                }
                            }
                        },
                        error: function (err) { }
                    });
                });

                //Company
                await new Promise((resolve, reject) => {
                    iCounter = 0; 
                    filteroModel.read("/ZVB_3DERP_VPO_COMPANY", {
                        success: function (oData, oResponse) {
                            for(var item in oData.results){
                                iCounter++;
                                if(oData.results[item].SBU === vSBU){
                                    if(oData.results[item].COMPANY === company){
                                        topHeaderDataChange.CompanyDesc = " - " + oData.results[item].DESCRIPTION;
                                    }
                                }
                                if(iCounter === oData.results.length){
                                    resolve();
                                }
                            }
                        },
                        error: function (err) { }
                    });
                });

                //PurchPlant
                await new Promise((resolve, reject) => {
                    iCounter = 0; 
                    filteroModel.read("/ZVB_3DERP_VPO_PURCHPLANT_SH", {
                        success: function (oData, oResponse) {
                            for(var item in oData.results){
                                iCounter++;
                                if(oData.results[item].PURCHPLANT === purchPlant){
                                    topHeaderDataChange.PurchPlantDesc = " - " + oData.results[item].DESCRIPTION;
                                }
                                if(iCounter === oData.results.length){
                                    resolve();
                                }
                            }
                        },
                        error: function (err) { }
                    });
                });

                //Ship Mode
                await new Promise((resolve, reject) => {
                    iCounter = 0; 
                    filteroModel.read("/ZVB_3DERP_VPO_SHIPMODE_SH", {
                        success: function (oData, oResponse) {
                            for(var item in oData.results){
                                iCounter++;
                                if(oData.results[item].SBU === vSBU){
                                    if(oData.results[item].SHIPMODE === shipMode){
                                        topHeaderDataChange.ShipModeDesc = " - " + oData.results[item].DESCRIPTION;
                                    }
                                }
                                if(iCounter === oData.results.length){
                                    resolve();
                                }
                            }
                        },
                        error: function (err) { }
                    });
                });

                oJSONModel.setData(topHeaderDataChange);
                oView.setModel(oJSONModel, "topHeaderData");

            },

            onSuggestionItems: async function(){
                var me = this;
                var vSBU = this._sbu;
                var filteroModel = this.getOwnerComponent().getModel("ZVB_3DERP_VPO_FILTERS_CDS");

                //Ship to Plant
                await new Promise((resolve, reject) => {
                    filteroModel.read("/ZVB_3DERP_SHIPTOPLANT_SH", {
                        success: function (oData, oResponse) {
                            var dataResult = [];
                            oData.results.forEach(item=>{
                                item.Item = item.ShipToPlant;
								item.Desc = item.DESCRIPTION;
                                item.SHIPTOPLANT = item.ShipToPlant;
								dataResult.push(item);
                            });
                            resolve(me.getView().setModel(new JSONModel(dataResult), "onSuggSHIPTOPLANT"));
                        },
                        error: function (err) { }
                    });
                });

                
                //Payment Terms
                await new Promise((resolve, reject) => {
                    filteroModel.read("/ZVB_3DERP_VPO_PAYMNTTERMS_SH", {
                        success: function (oData, oResponse) {
                            var dataResult = [];
                            oData.results.forEach(item=>{
                                item.Item = item.PAYMNTTERMS;
								item.Desc = item.DESCRIPTION;
								dataResult.push(item);
                            });
                            resolve(me.getView().setModel(new JSONModel(dataResult), "onSuggPAYMNTTERMS"));
                        },
                        error: function (err) { }
                    });
                });

                
                //Incoterms
                await new Promise((resolve, reject) => {
                    filteroModel.read("/ZVB_3DERP_INCOTERMS", {
                        success: function (oData, oResponse) {
                            var dataResult = [];
                            oData.results.forEach(item=>{
                                item.Item = item.INCOTERMS;
								item.Desc = item.INCOTERMSDET;
                                item.DESCRIPTION = item.INCOTERMSDET;
								dataResult.push(item);
                            });
                            resolve(me.getView().setModel(new JSONModel(dataResult), "onSuggINCOTERMS"));
                        },
                        error: function (err) { }
                    });
                });
            },

            getColumnProp: async function() {
                var sPath = jQuery.sap.getModulePath("zuivendorpo", "/model/columns.json");
    
                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);
    
                this._tblColumns = oModelColumns.getData();
                this._oModelColumns = oModelColumns.getData();
            },

            getMain: async function(){
                this._oDataBeforeChange = {}
                var oModel = this.getOwnerComponent().getModel();
                var _this = this;
                var poNo = this._pono;
                var condrec = this.getView().getModel("ui").getProperty("/activeCondRec");

                let poItem = "";
                await new Promise(async (resolve, reject) => {
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

                    _this.getView().setModel(new JSONModel({
                        results: []
                    }), "VPOHdrCond");

                    _this.getView().setModel(new JSONModel({
                        results: []
                    }), "VPOHdrOthInfo");

                    _this.getView().setModel(new JSONModel({
                        results: []
                    }), "VPOHdrDownloadHist");

                    _this.getView().setModel(new JSONModel({
                        results: []
                    }), "VPOReceiptsIssuancesVPODet");
                    
                    resolve(await _this.getPODetails2(poNo));
                    resolve(await _this.getDelSchedule2(poNo));
                    resolve(await _this.getDelInvoice2(poNo));
                    poItem = _this.getView().getModel("ui").getProperty("/activePOItem");
                    resolve(await _this.getPOHistory2(poNo, poItem));
                    resolve(await _this.getConditions2(condrec, poItem));
                    resolve(await _this.getReceiptAndIssuances(poNo));
                    resolve(await _this.onLoadHeaderConditions(condrec));
                    // resolve(await _this.onLoadHeaderOthInfo(poNo));
                    resolve(await _this.onLoadHeaderDownloadHist(poNo));
                    resolve();
                });
            },

            getPOHistory2: async function(PONO, POITEM){
                var oModel = this.getOwnerComponent().getModel();
                var me = this;
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
                            me.getView().setModel(oJSONModel, "VPOPOHistVPODet");
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
            },
            getDelInvoice2: async function(PONO){
                var oModel = this.getOwnerComponent().getModel();
                var me = this;
                var vSBU = this._sbu;
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
                            me.getView().setModel(oJSONModel, "VPODelInvVPODet");
                            resolve();
                        },
                        error: function (err) { 
                            resolve();
                        }
                    });
                });
                
            },
            getConditions2: async function(CONDREC, POITEM){
                var oModel = this.getOwnerComponent().getModel();
                var me = this;
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
                            me.getView().setModel(oJSONModel, "VPOCondVPODet");
                            resolve();
                        },
                        error: function (err) {
                            resolve();    
                        }
                    });
                });
                
            },
            getDelSchedule2: async function(PONO){
                var oModel = this.getOwnerComponent().getModel();
                var me = this;
                var vSBU = this._sbu;
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
                                    item.DELDT = dateFormat.format(item.DELDT);
                                    item.ETD = dateFormat.format(item.ETD);
                                    item.ETDPORT = dateFormat.format(item.ETDPORT);
                                    item.ETAFTY = dateFormat.format(item.ETAFTY);
                                    item.EXFTY = dateFormat.format(item.EXFTY);
                                    item.CREATEDDT = dateFormat.format(item.CREATEDDT);
                                    item.UPDATEDDT = dateFormat.format(item.UPDATEDDT);
                                    // item.DELETED = item.DELETED === "" ? false : true;
                                })
                                objectData.push(data.results);
                                objectData[0].sort((a,b) => (a.ITEM > b.ITEM) ? 1 : ((b.ITEM > a.ITEM) ? -1 : 0));

                                oJSONModel.setData(data);
                            }
                            me.getView().setModel(oJSONModel, "VPODelSchedVPODet");
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
                
            },
            getPODetails2: async function(PONO){
                var oModel = this.getOwnerComponent().getModel();
                var me = this;
                var vSBU = this._sbu;
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
                                    item.CREATEDDT = dateFormat.format(new Date(item.CREATEDDT)) + " " + timeFormat.format(new Date(item.CREATEDTM.ms + TZOffsetMs));
                                    item.DELETED = item.DELETED === "L" ? true : false;
                                    me._condPOItemMatNoStore.push({
                                        poItem: item.ITEM,
                                        matNo: item.MATNO,
                                        shortText: item.SHORTTEXT
                                    });

                                    me._poItemStore.push({
                                        poItem: item.ITEM,
                                    })
                                })
                                
                                //sort by PO Item
                                me._condPOItemMatNoStore.sort(function(a, b) {
                                    return a.poItem.localeCompare(b.poItem);
                                });

                                //sort by PO Item
                                me._poItemStore.sort(function(a, b) {
                                    return a.poItem.localeCompare(b.poItem);
                                });
                                
                                objectData.push(data.results);
                                objectData[0].sort((a,b) => (a.ITEM > b.ITEM) ? 1 : ((b.ITEM > a.ITEM) ? -1 : 0));
                                
                                oJSONModel.setData(data);
                            }
                            var poItem = data.results[0].ITEM;
                            var matNo = data.results[0].MATNO;
                            var shortText = data.results[0].SHORTTEXT;
                            me.getView().getModel("ui").setProperty("/activePOItem", poItem);
                            me.getView().getModel("ui").setProperty("/condMatNo", matNo);
                            me.getView().getModel("ui").setProperty("/condShortText", shortText);

                            me.getView().setModel(oJSONModel, "VPODtlsVPODet");

                            //Table Filter
						    TableFilter.applyColFilters("vpoDetailsTab", me);

                            resolve();
                        },
                        error: function (err) { 
                            resolve();
                        }
                    });
                });
            },
            getReceiptAndIssuances: async function(PONO){
                var oModel = this.getOwnerComponent().getModel();
                var me = this;
                var tblChange = this._tblChange;
                var oJSONModel = new JSONModel();
                var objectData = [];
                await new Promise((resolve, reject)=>{
                    oModel.read('/VPOReceiptsAndIssuancesSet', { 
                        urlParameters: {
                            "$filter": "PONO eq '" + PONO + "'"
                        },
                        success: function (data, response) {
                            if (data.results.length > 0) {
                                data.results.forEach(item => {
                                    item.CREATEDDT = dateFormat.format(item.CREATEDDT) + " " + timeFormat.format(new Date(item.CREATEDDTM.ms + TZOffsetMs));
                                    item.POSTINGDT = dateFormat.format(item.POSTINGDT);
                                })

                                // objectData.push(data.results);
                                // objectData[0].sort((a,b) => (a.ITEM > b.ITEM) ? 1 : ((b.ITEM > a.ITEM) ? -1 : 0));
                                oJSONModel.setData(data);
                            }
                            me.getView().setModel(oJSONModel, "VPOReceiptsIssuancesVPODet");
                            resolve();
                        },
                        error: function (err) { 
                            resolve();
                        }
                    });
                });
            },


            getCols: async function() {
                await this.getDynamicColumns("VPODTLS", "ZDV_3DERP_VPDTLS");
                
                await this.getDynamicColumns('VPODELSCHED','ZVB_VPO_DELSCHED');
                
                await this.getDynamicColumns('VPODELINV','ZDV_3DERP_DELINV');
                
                await this.getDynamicColumns('VPOHISTORY','ZDV_3DERP_POHIST');
            
                await this.getDynamicColumns('VPOCOND','ZDV_3DERP_COND');

                await this.getDynamicColumns('VPOHDRCOND','ZDV3DERP_HDRCOND');

                await this.getDynamicColumns('VPOHDRDOWNLOADHIST','ZDV3DERP_POHIST');

                await this.getDynamicColumns('VPORECEIPTSISSUANCES','ZVB_VPO_RECISS');

            },
            getDynamicColumns: async function(model, dataSource) {
                var me = this;
                var modCode = model;
                var tabName = dataSource;
                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new JSONModel();
                //var vSBU = this.getView().getModel("ui").getData().sbu;
                var vSBU = this._sbu;

                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                oModel.setHeaders({
                    sbu: vSBU,
                    type: modCode,
                    tabname: tabName
                });
                await new Promise((resolve, reject) => {
                    oModel.read("/ColumnsSet", {
                        success: async function (oData, oResponse) {
                            if (oData.results.length > 0) {
                                me._columnLoadError = false;
                                if (modCode === 'VPODTLS') {
                                    me._aColumns["vpoDetailsTab"] = oData.results;
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VPODTLSColumnsVPODet");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                if (modCode === 'VPODELSCHED') {
                                    me._aColumns["vpoDelSchedTab"] = oData.results;
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VPODELSCHEDColumnsVPODet");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                if (modCode === 'VPODELINV') {
                                    me._aColumns["vpoDelInvTab"] = oData.results;
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VPODELINVColumnsVPODet");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                if (modCode === 'VPOHISTORY') {
                                    me._aColumns["vpoPoHistTab"] = oData.results;
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VPOHISTORYColumnsVPODet");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                if (modCode === 'VPOCOND') {
                                    me._aColumns["vpoConditionsTab"] = oData.results;
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VPOCONDColumnsVPODet");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }

                                if (modCode === 'VPORECEIPTSISSUANCES') {
                                    me._aColumns["vpoReceiptsIssuancesTab"] = oData.results;
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VPOReceiptsIssuancesColumnsVPODet");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                                //Add PR to PO Column
                                if (modCode === 'VPOADDPRTOPO') {
                                    me._aColumns["vpoAddPRtoPOTbl"] = oData.results;
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VPOAddPRtoPOColumns");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }

                                //Change Material
                                if (modCode === 'VPOCHANGEMAT') {
                                    me._aColumns["vpoChangeMatTbl"] = oData.results;
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VPOChangeMaterialColumns");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }

                                if (modCode === 'VPOHDRCOND') {
                                    me._aColumns["HdrConditonsTbl"] = oData.results;
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VPOHdrCondColumns");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }

                                if (modCode === 'VPOHDRDOWNLOADHIST') {
                                    me._aColumns["HdrDownloadHistTbl"] = oData.results;
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "VPOHdrDownloadHistColumns");
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

                                if (modCode === 'VPORECEIPTSISSUANCES') {
                                    me.getView().setModel(oJSONColumnsModel, "VPOReceiptsIssuancesColumnsVPODet");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }

                                //Add PR to PO Column
                                if (modCode === 'VPOADDPRTOPO') {
                                    me.getView().setModel(oJSONColumnsModel, "VPOAddPRtoPOColumns");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }

                                //Change Material
                                if (modCode === 'VPOCHANGEMAT') {
                                    me.getView().setModel(oJSONColumnsModel, "VPOChangeMaterialColumns");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }

                                if (modCode === 'VPOHDRCOND') {
                                    me.getView().setModel(oJSONColumnsModel, "VPOHdrCondColumns");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }

                                if (modCode === 'VPOHDRDOWNLOADHIST') {
                                    me.getView().setModel(oJSONColumnsModel, "VPOHdrDownloadHistColumns");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }

                            }
                        },
                        error: function (err) {
                            me._columnLoadError = true;
                            Common.closeLoadingDialog(that);
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

                if (modCode === 'VPORECEIPTSISSUANCES') {
                    oColumnsModel = me.getView().getModel("VPOReceiptsIssuancesVPODet");  
                    oDataModel = me.getView().getModel("VPOReceiptsIssuancesColumnsVPODet"); 
                    
                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');

                    if(me._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');   
                    me.addColumns("vpoReceiptsIssuancesTab", oColumnsData, oData, "VPOReceiptsIssuancesVPODet");
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

                //Change Material
                if (modCode === 'VPOCHANGEMAT') {
                    oColumnsModel = me.getView().getModel("VPOChangeMaterialData");  
                    oDataModel = me.getView().getModel("VPOChangeMaterialColumns"); 
                    
                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/');

                    if(me._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');   
                    me.addColumns("vpoChangeMatTbl", oColumnsData, oData, "VPOChangeMaterialData");
                }

                if (modCode === 'VPOHDRCOND') {
                    oColumnsModel = me.getView().getModel("VPOHdrCond");  
                    oDataModel = me.getView().getModel("VPOHdrCondColumns"); 
                    
                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');

                    if(me._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');
                    me.addColumns("HdrConditonsTbl", oColumnsData, oData, "VPOHdrCond");
                }

                if (modCode === 'VPOHDRDOWNLOADHIST') {
                    oColumnsModel = me.getView().getModel("VPOHdrDownloadHist");  
                    oDataModel = me.getView().getModel("VPOHdrDownloadHistColumns"); 
                    
                    oData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/results');

                    if(me._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oDataModel.getProperty('/');
                    me.addColumns("HdrDownloadHistTbl", oColumnsData, oData, "VPOHdrDownloadHist");
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

                    if (table === "vpoDetailsTab" && sColumnId === "PRNO") {
                        var oControl = new sap.m.Link({
                            text: "{" + sColumnId + "}",
                            wrapping: false, 
                            tooltip: "{" + sColumnId + "}",
                            press: function(oEvent) {
                                const vRow = oEvent.oSource.getBindingInfo("text").binding.getContext().sPath;
                                const vPRNo =  oEvent.oSource.mProperties.text;
                                const vPRItem =  oTable.getModel().getProperty(vRow + "/PRITM");
                                var oData = {
                                    DOCTYPE: "PR",
                                    PRNO: vPRNo,
                                    PRITEM: vPRItem
                                }

                                me.viewDoc(oData);

                                // window.open(`https://ltd.luenthai.com:44300/sap/bc/ui2/flp?sap-client=888#ZSO_3DERP_PUR_PR-dispaly&/PRDetail/VER/5000000487/00010` , "_blank");
                            },
                        })
                        oControl.addStyleClass("hyperlink");

                        return new sap.ui.table.Column({
                            id: model+"-"+sColumnId,
                            label: new sap.m.Text({text: sColumnLabel}),
                            template: oControl,
                            width: sColumnWidth + "px",
                            hAlign: me.columnSize(sColumnId),
                            sortProperty: sColumnId,
                            filterProperty: sColumnId,
                            autoResizable: true,
                            visible: sColumnVisible,
                            sorted: sColumnSorted,
                            sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                        });
                    }else if (table === "vpoDetailsTab" && sColumnId === "BATCH") {
                        var oControl = new sap.m.Link({
                            text: "{" + sColumnId + "}",
                            wrapping: false, 
                            tooltip: "{" + sColumnId + "}",
                            press: function(oEvent) {
                                const vRow = oEvent.oSource.getBindingInfo("text").binding.getContext().sPath;
                                const vIONo =  oEvent.oSource.mProperties.text;
                                const vStyleNo =  oTable.getModel().getProperty(vRow + "/STYLENO");
                                var oData = {
                                    STYLENO: vStyleNo,
                                    IONO: vIONo
                                }
                                me.navToIOMatList(oData);
                            },
                        })
                        oControl.addStyleClass("hyperlink");

                        return new sap.ui.table.Column({
                            id: model+"-"+sColumnId,
                            label: new sap.m.Text({text: sColumnLabel}),
                            template: oControl,
                            width: sColumnWidth + "px",
                            hAlign: me.columnSize(sColumnId),
                            sortProperty: sColumnId,
                            filterProperty: sColumnId,
                            autoResizable: true,
                            visible: sColumnVisible,
                            sorted: sColumnSorted,
                            sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                        });
                    }
                    else if (table === "vpoPoHistTab" && sColumnId === "MATDOC") {
                        var oControl = new sap.m.Link({
                            text: "{" + sColumnId + "}",
                            wrapping: false, 
                            tooltip: "{" + sColumnId + "}",
                            press: function(oEvent) {
                                const vRow = oEvent.oSource.getBindingInfo("text").binding.getContext().sPath;
                                const vMatDocNo =  oEvent.oSource.mProperties.text;
                                const vMatDocItem =  oTable.getModel().getProperty(vRow + "/ITEM");
                                const vMatDocYr =  oTable.getModel().getProperty(vRow + "/MATDOCYR");
                                const vPONo =  oTable.getModel().getProperty(vRow + "/PONO");
                                const vPOItem =  oTable.getModel().getProperty(vRow + "/ITEM2");

                                var oData = {
                                    DOCTYPE: "MAT",
                                    MBLNR: vMatDocNo,
                                    MJAHR: vMatDocYr,
                                    ZEILE: vMatDocItem,
                                    EBELN: "",
                                    EBELP: ""
                                }

                                me.viewDoc(oData);
                            },
                        })
                        oControl.addStyleClass("hyperlink");

                        return new sap.ui.table.Column({
                            id: model+"-"+sColumnId,
                            label: new sap.m.Text({text: sColumnLabel}),
                            template: oControl,
                            width: sColumnWidth + "px",
                            hAlign: me.columnSize(sColumnId),
                            sortProperty: sColumnId,
                            filterProperty: sColumnId,
                            autoResizable: true,
                            visible: sColumnVisible,
                            sorted: sColumnSorted,
                            sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                        });
                    }
                    else if (sColumnType === "STRING" || sColumnType === "DATETIME"|| sColumnType === "BOOLEAN") {
                        return new sap.ui.table.Column({
                            id: model+"-"+sColumnId,
                            label: new sap.m.Text({text: sColumnLabel}),
                            template: me.columnTemplate(sColumnId, sColumnType),
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
                            label: new sap.m.Text({text: sColumnLabel}),
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

                //date/number sorting
                oTable.attachSort(function(oEvent) {
                    var sPath = oEvent.getParameter("column").getSortProperty();
                    var bDescending = false;
                    
                    //remove sort icon of currently sorted column
                    oTable.getColumns().forEach(col => {
                        if (col.getSorted()) {
                            col.setSorted(false);
                        }
                    })

                    oEvent.getParameter("column").setSorted(true); //sort icon initiator

                    if (oEvent.getParameter("sortOrder") === "Descending") {
                        bDescending = true;
                        oEvent.getParameter("column").setSortOrder("Descending") //sort icon Descending
                    }
                    else {
                        oEvent.getParameter("column").setSortOrder("Ascending") //sort icon Ascending
                    }

                    var oSorter = new sap.ui.model.Sorter(sPath, bDescending ); //sorter(columnData, If Ascending(false) or Descending(True))
                    var oColumn = columnsData.filter(fItem => fItem.ColumnName === oEvent.getParameter("column").getProperty("sortProperty"));
                    var columnType = oColumn[0].DataType;

                    if (columnType === "DATETIME") {
                        oSorter.fnCompare = function(a, b) {
                            // parse to Date object
                            var aDate = new Date(a);
                            var bDate = new Date(b);

                            if (bDate === null) { return -1; }
                            if (aDate === null) { return 1; }
                            if (aDate < bDate) { return -1; }
                            if (aDate > bDate) { return 1; }

                            return 0;
                        };
                    }
                    else if (columnType === "NUMBER") {
                        oSorter.fnCompare = function(a, b) {
                            // parse to Date object
                            var aNumber = +a;
                            var bNumber = +b;

                            if (bNumber === null) { return -1; }
                            if (aNumber === null) { return 1; }
                            if (aNumber < bNumber) { return -1; }
                            if (aNumber > bNumber) { return 1; }

                            return 0;
                        };
                    }
                    
                    oTable.getBinding('rows').sort(oSorter);
                    // prevent internal sorting by table
                    oEvent.preventDefault();
                });

                if(table === "HdrConditonsTbl"){
                    const totalCondValue = this.getView().getModel("ui").getProperty("/totalCondValue");
                    var oFooter = new sap.m.Toolbar({
                        content: [
                            new sap.m.Text({
                            text: "Condition Value Total: " + totalCondValue
                            })
                        ]
                    });
                    oTable.setFooter(oFooter);
                }
                //bind the data to the table
                oTable.bindRows("/rows");
                TableFilter.updateColumnMenu(table, this);
                
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
            
            loadReleaseStrategy: async function(){
                var me = this;
                var poNo = this._pono;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new sap.ui.model.json.JSONModel();
                var oView = this.getView();
                var relState = "";
                var relStateCount = 0

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
                        me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/relstrat", oData);
                        // me.setChangeStatus(false);
                    },
                    error: function (error) {
                        oView.setModel(oJSONModel, "relStratData");
                    }
                })
            },

            onReleaseStratRefresh: async function(){
                await this.loadReleaseStrategy();
            },

            remarksTblLoad: async function(){
                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var oParam = {};
                var pono = this._pono
                var oJSONModel = new sap.ui.model.json.JSONModel();
                var itemLastCnt = 0;
                
                oParam = {
                    Client:     '888',
                    Id:         'F01',
                    Language:   'EN',
                    Name:       pono,
                    Object:     'EKKO',
                    N_Read_Text_Lines: [],
                };
                await new Promise((resolve, reject)=>{
                    oModel.create("/READ_TEXTSet", oParam, { 
                        method: "POST",
                        success: function(oResult, oResponse) {
                            if(oResult.N_Read_Text_Lines.results.length > 0){
                                oResult.N_Read_Text_Lines.results.forEach(e=>{
                                    if(isNaN(e.Tdformat)){
                                        itemLastCnt = itemLastCnt + 1;
                                        e.Tdformat = itemLastCnt.toString();
                                    }
                                })
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
            pkngInstTblLoad: async function(){
                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var oParam = {};
                var pono = this._pono
                var oJSONModel = new sap.ui.model.json.JSONModel();
                var itemLastCnt = 0;

                oParam = {
                    Client:     '888',
                    Id:         'F06',
                    Language:   'EN',
                    Name:       pono,
                    Object:     'EKKO',
                    N_Read_Text_Lines: [],
                };

                
                await new Promise((resolve, reject)=>{
                    oModel.create("/READ_TEXTSet", oParam, { 
                        method: "POST",
                        success: function(oResult, oResponse) {
                            if(oResult.N_Read_Text_Lines.results.length > 0){
                                oResult.N_Read_Text_Lines.results.forEach(e=>{
                                    if(isNaN(e.Tdformat)){
                                        itemLastCnt = itemLastCnt + 1;
                                        e.Tdformat = itemLastCnt.toString();
                                    }
                                })
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
                this._aColumns["remarksTab"] = remColumn;
                this.getView().setModel(oJSONColumnsModel, "VPORemarksCol");

                oJSONColumnsModel2.setData(pkngInstColumn);
                this._aColumns["packinsTab"] = pkngInstColumn;
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
                            label: new sap.m.Text({text: sColumnLabel}),
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
                            label: new sap.m.Text({text: sColumnLabel}),
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
                            label: new sap.m.Text({text: sColumnLabel}),
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

                //date/number sorting
                oTable.attachSort(function(oEvent) {
                    var sPath = oEvent.getParameter("column").getSortProperty();
                    var bDescending = false;
                    
                    //remove sort icon of currently sorted column
                    oTable.getColumns().forEach(col => {
                        if (col.getSorted()) {
                            col.setSorted(false);
                        }
                    })

                    oEvent.getParameter("column").setSorted(true); //sort icon initiator

                    if (oEvent.getParameter("sortOrder") === "Descending") {
                        bDescending = true;
                        oEvent.getParameter("column").setSortOrder("Descending") //sort icon Descending
                    }
                    else {
                        oEvent.getParameter("column").setSortOrder("Ascending") //sort icon Ascending
                    }

                    var oSorter = new sap.ui.model.Sorter(sPath, bDescending ); //sorter(columnData, If Ascending(false) or Descending(True))
                    var oColumn = columnsData.filter(fItem => fItem.ColumnName === oEvent.getParameter("column").getProperty("sortProperty"));
                    var columnType = oColumn[0].DataType;

                    if (columnType === "DATETIME") {
                        oSorter.fnCompare = function(a, b) {
                            // parse to Date object
                            var aDate = new Date(a);
                            var bDate = new Date(b);

                            if (bDate === null) { return -1; }
                            if (aDate === null) { return 1; }
                            if (aDate < bDate) { return -1; }
                            if (aDate > bDate) { return 1; }

                            return 0;
                        };
                    }
                    else if (columnType === "NUMBER") {
                        oSorter.fnCompare = function(a, b) {
                            // parse to Date object
                            var aNumber = +a;
                            var bNumber = +b;

                            if (bNumber === null) { return -1; }
                            if (aNumber === null) { return 1; }
                            if (aNumber < bNumber) { return -1; }
                            if (aNumber > bNumber) { return 1; }

                            return 0;
                        };
                    }
                    
                    oTable.getBinding('rows').sort(oSorter);
                    // prevent internal sorting by table
                    oEvent.preventDefault();
                });

                //bind the data to the table
                oTable.bindRows("/rows");
                TableFilter.updateColumnMenu("RemarksTbl", this);
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
                            label: new sap.m.Text({text: sColumnLabel}),
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
                            label: new sap.m.Text({text: sColumnLabel}),
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
                            label: new sap.m.Text({text: sColumnLabel}),
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

                //date/number sorting
                oTable.attachSort(function(oEvent) {
                    var sPath = oEvent.getParameter("column").getSortProperty();
                    var bDescending = false;
                    
                    //remove sort icon of currently sorted column
                    oTable.getColumns().forEach(col => {
                        if (col.getSorted()) {
                            col.setSorted(false);
                        }
                    })

                    oEvent.getParameter("column").setSorted(true); //sort icon initiator

                    if (oEvent.getParameter("sortOrder") === "Descending") {
                        bDescending = true;
                        oEvent.getParameter("column").setSortOrder("Descending") //sort icon Descending
                    }
                    else {
                        oEvent.getParameter("column").setSortOrder("Ascending") //sort icon Ascending
                    }

                    var oSorter = new sap.ui.model.Sorter(sPath, bDescending ); //sorter(columnData, If Ascending(false) or Descending(True))
                    var oColumn = columnsData.filter(fItem => fItem.ColumnName === oEvent.getParameter("column").getProperty("sortProperty"));
                    var columnType = oColumn[0].DataType;

                    if (columnType === "DATETIME") {
                        oSorter.fnCompare = function(a, b) {
                            // parse to Date object
                            var aDate = new Date(a);
                            var bDate = new Date(b);

                            if (bDate === null) { return -1; }
                            if (aDate === null) { return 1; }
                            if (aDate < bDate) { return -1; }
                            if (aDate > bDate) { return 1; }

                            return 0;
                        };
                    }
                    else if (columnType === "NUMBER") {
                        oSorter.fnCompare = function(a, b) {
                            // parse to Date object
                            var aNumber = +a;
                            var bNumber = +b;

                            if (bNumber === null) { return -1; }
                            if (aNumber === null) { return 1; }
                            if (aNumber < bNumber) { return -1; }
                            if (aNumber > bNumber) { return 1; }

                            return 0;
                        };
                    }
                    
                    oTable.getBinding('rows').sort(oSorter);
                    // prevent internal sorting by table
                    oEvent.preventDefault();
                });

                //bind the data to the table
                oTable.bindRows("/rows");
                TableFilter.updateColumnMenu("PackingInstTbl", this);
            },
            onNewHdrTxt: async function(type){
                var me = this;
                var bProceed = true

                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
                    bProceed = false;
                }
                if(bProceed){
                    if(type === 'Remarks'){
                        var remarksItemArr = [];
                        var remarksItemLastCnt = 0;
                        var remarksJSONModel = new JSONModel();
                        var remarksItemObj = this.getView().getModel("remarksTblData").getProperty('/');
                        
                        remarksItemObj = remarksItemObj.length === undefined ? [] : remarksItemObj;

                        for(var x = 0; x < remarksItemObj.length; x++){
                            remarksItemArr.push(remarksItemObj[x].Tdformat);
                        }
                        remarksItemArr.sort(function(a, b){return b - a});
                        remarksItemLastCnt = isNaN(remarksItemArr[0]) ? 0 : remarksItemArr[0];
                        
                        remarksItemLastCnt = String(parseInt(remarksItemLastCnt) + 1);

                        remarksItemObj.push({
                            Tdformat: remarksItemLastCnt,
                            Tdline: ""
                        });

                        remarksJSONModel.setData(remarksItemObj);
                        this.getView().setModel(remarksJSONModel, "remarksTblData");
                        this.remarksSetTblColData();

                        this.byId("vpoNewHdrTxtRemarks").setVisible(true);
                        this.byId("vpoEditHdrTxtRemarks").setVisible(false);
                        this.byId("vpoDeleteHdrTxtRemarks").setVisible(false);
                        this.byId("vpoSaveHdrTxtRemarks").setVisible(true);
                        this.byId("vpoCancelHdrTxtRemarks").setVisible(true);

                        this.disableOtherTabs("idIconTabBarInlineMode");
                        this.disableOtherTabs("vpoDetailTab");

                        this.byId("vpoNewHdrTxtPkgInst").setEnabled(false);
                        this.byId("vpoEditHdrTxtPkgInst").setEnabled(false);
                        this.byId("vpoDeleteHdrTxtPkgInst").setEnabled(false);

                        this.onRowEditPO("RemarksTbl", "VPORemarksCol");
                    }
                    if(type === 'PkgInst'){
                        var pkgInstItemArr = [];
                        var pkgInstItemLastCnt = 0;
                        var pkgInstJSONModel = new JSONModel();
                        var pkgInstItemObj = this.getView().getModel("pkngInstTblData").getProperty('/');

                        pkgInstItemObj = pkgInstItemObj.length === undefined ? [] :pkgInstItemObj;
                        for(var x = 0; x < pkgInstItemObj.length; x++){
                            pkgInstItemArr.push(pkgInstItemObj[x].Tdformat);
                        }
                        pkgInstItemArr.sort(function(a, b){return b - a});
                        pkgInstItemLastCnt = isNaN(pkgInstItemArr[0]) ? 0 : pkgInstItemArr[0];
                        
                        pkgInstItemLastCnt = String(parseInt(pkgInstItemLastCnt) + 1);
                        
                        pkgInstItemObj.push({
                            Tdformat: pkgInstItemLastCnt,
                            Tdline: ""
                        });

                        pkgInstJSONModel.setData(pkgInstItemObj);
                        this.getView().setModel(pkgInstJSONModel, "pkngInstTblData");
                        this.pkngInstSetTblColData();

                        this.byId("vpoNewHdrTxtPkgInst").setVisible(true);
                        this.byId("vpoEditHdrTxtPkgInst").setVisible(false);
                        this.byId("vpoDeleteHdrTxtPkgInst").setVisible(false);
                        this.byId("vpoSaveHdrTxtPkgInst").setVisible(true);
                        this.byId("vpoCancelHdrTxtPkgInst").setVisible(true);

                        this.disableOtherTabs("idIconTabBarInlineMode");
                        this.disableOtherTabs("vpoDetailTab");

                        this.byId("vpoNewHdrTxtRemarks").setEnabled(false);
                        this.byId("vpoEditHdrTxtRemarks").setEnabled(false);
                        this.byId("vpoDeleteHdrTxtRemarks").setEnabled(false);
                        
                        this.onRowEditPO("PackingInstTbl", "VPOPkngInstsCol");
                    }
                }else{
                    MessageBox.information(_captionList.INFO_PO_NOT_VALID_TO_EDIT)
                }
            },
            onEditHdrTxt: async function(type){
                var me = this;
                var bProceed = true

                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
                    bProceed = false
                }

                var oTable;
                var oSelectedIndices;
                if(bProceed){
                    if(type === 'Remarks'){
                        oTable = this.byId("RemarksTbl");
                        oSelectedIndices = oTable.getBinding("rows").aIndices;
                        if(oSelectedIndices.length > 0){
                            await this.remarksTblLoad();

                            this.byId("vpoNewHdrTxtRemarks").setVisible(false);
                            this.byId("vpoEditHdrTxtRemarks").setVisible(false);
                            this.byId("vpoDeleteHdrTxtRemarks").setVisible(false);
                            this.byId("vpoSaveHdrTxtRemarks").setVisible(true);
                            this.byId("vpoCancelHdrTxtRemarks").setVisible(true);

                            this.disableOtherTabs("idIconTabBarInlineMode");
                            this.disableOtherTabs("vpoDetailTab");

                            this.byId("vpoNewHdrTxtPkgInst").setEnabled(false);
                            this.byId("vpoEditHdrTxtPkgInst").setEnabled(false);
                            this.byId("vpoDeleteHdrTxtPkgInst").setEnabled(false);
                            
                            this.onRowEditPO("RemarksTbl", "VPORemarksCol");
                        }else{
                            MessageBox.error(this.getView().getModel("captionMsg").getData()["INFO_NO_DATA_EDIT"]);
                        }
                    }
                    if(type === 'PkgInst'){
                        oTable = this.byId("PackingInstTbl");
                        oSelectedIndices = oTable.getBinding("rows").aIndices;
                        if(oSelectedIndices.length > 0){
                            await this.pkngInstTblLoad();

                            this.byId("vpoNewHdrTxtPkgInst").setVisible(false);
                            this.byId("vpoEditHdrTxtPkgInst").setVisible(false);
                            this.byId("vpoDeleteHdrTxtPkgInst").setVisible(false);
                            this.byId("vpoSaveHdrTxtPkgInst").setVisible(true);
                            this.byId("vpoCancelHdrTxtPkgInst").setVisible(true);
        
                            this.disableOtherTabs("idIconTabBarInlineMode");
                            this.disableOtherTabs("vpoDetailTab");
        
                            this.byId("vpoNewHdrTxtRemarks").setEnabled(false);
                            this.byId("vpoEditHdrTxtRemarks").setEnabled(false);
                            this.byId("vpoDeleteHdrTxtRemarks").setEnabled(false);
                            
                            this.onRowEditPO("PackingInstTbl", "VPOPkngInstsCol");
                        }else{
                            MessageBox.error(this.getView().getModel("captionMsg").getData()["INFO_NO_DATA_EDIT"]);
                        }
                        
                    }
                }else{
                    MessageBox.information(_captionList.INFO_PO_NOT_VALID_TO_EDIT)
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

                if(type === 'Remarks'){
                    Common.openLoadingDialog(that);
                    oTable = this.byId("RemarksTbl");
                    oSelectedIndices = oTable.getBinding("rows").aIndices;

                    aData = oTable.getModel().getData().rows;
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })
                    oSelectedIndices = oTmpSelectedIndices;
                    oSelectedIndices.forEach((item, index) => {
                        if(aData.at(item).Tdline !== ""){
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
                        }
                        
                    });

                    if (oParamDataPOHdr.length > 0) {
                        oParam = oParamInitParam;
                        oParam['N_ChangePOHdrTextParam'] = oParamDataPOHdr;
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
                                        MessageBox.information(_captionList.INFO_NO_DTLS_TO_SAVE);
                                        resolve()
                                    }
                                },error: function(error){
                                    MessageBox.error(_captionList.INFO_ERROR);
                                    Common.closeLoadingDialog(that);
                                    //error message
                                    resolve()
                                }
                            })
                        });
                        await _promiseResult;
                    }

                    this.byId("vpoNewHdrTxtRemarks").setVisible(true);
                    this.byId("vpoEditHdrTxtRemarks").setVisible(true);
                    this.byId("vpoDeleteHdrTxtRemarks").setVisible(true);
                    this.byId("vpoSaveHdrTxtRemarks").setVisible(false);
                    this.byId("vpoCancelHdrTxtRemarks").setVisible(false);

                    this.enableOtherTabs("idIconTabBarInlineMode");
                    this.enableOtherTabs("vpoDetailTab");

                    this.byId("vpoNewHdrTxtPkgInst").setEnabled(true);
                    this.byId("vpoEditHdrTxtPkgInst").setEnabled(true);
                    this.byId("vpoDeleteHdrTxtPkgInst").setEnabled(true);
                    
                    await this.loadAllData();
                    
                    Common.closeLoadingDialog(that);
                }
                if(type === 'PkgInst'){
                    Common.openLoadingDialog(that);
                    oTable = this.byId("PackingInstTbl");
                    oSelectedIndices = oTable.getBinding("rows").aIndices;

                    aData = oTable.getModel().getData().rows;
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })
                    oSelectedIndices = oTmpSelectedIndices;
                    oSelectedIndices.forEach((item, index) => {
                        if(aData.at(item).Tdline !== ""){
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
                        }
                    });

                    if (oParamDataPOHdr.length > 0) {
                        oParam = oParamInitParam;
                        oParam['N_ChangePOHdrTextParam'] = oParamDataPOHdr;
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
                                        MessageBox.information(_captionList.INFO_NO_DTLS_TO_SAVE);
                                        resolve()
                                    }
                                },error: function(error){
                                    MessageBox.error(_captionList.INFO_ERROR);
                                    Common.closeLoadingDialog(that);
                                    //error message
                                    resolve()
                                }
                            })
                        });
                        await _promiseResult;
                    }

                    this.byId("vpoNewHdrTxtPkgInst").setVisible(true);
                    this.byId("vpoEditHdrTxtPkgInst").setVisible(true);
                    this.byId("vpoDeleteHdrTxtPkgInst").setVisible(true);
                    this.byId("vpoSaveHdrTxtPkgInst").setVisible(false);
                    this.byId("vpoCancelHdrTxtPkgInst").setVisible(false);

                    this.enableOtherTabs("idIconTabBarInlineMode");
                    this.enableOtherTabs("vpoDetailTab");

                    this.byId("vpoNewHdrTxtRemarks").setEnabled(true);
                    this.byId("vpoEditHdrTxtRemarks").setEnabled(true);
                    this.byId("vpoDeleteHdrTxtRemarks").setEnabled(true);
                    
                    await this.loadAllData();

                    Common.closeLoadingDialog(that);
                }
            },
            onDeleteEditHdrTxt: async function(type){
                var me = this;
                var poNo = this._pono;

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

                var bProceed = true

                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
                    bProceed = false
                }
                
                if(bProceed){

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

                            oParamInitParam = {
                                IPoNumber: poNo,
                                IDoDownload: "N",
                                IChangeonlyHdrplants: "N",
                            }
                            if(aDataToNotDelete.length > 0){
                                aDataToNotDelete.forEach(item=>{
                                    oParamDataPOHdr.push({
                                        PoNumber: poNo,
                                        PoItem: "00000",
                                        TextId: "F01",
                                        TextForm: "*",
                                        TextLine: item.Tdline
                                    })
                                });
                            }else{
                                oParamDataPOHdr.push({
                                    PoNumber: poNo,
                                    PoItem: "00000",
                                    TextId: "F01",
                                    TextForm: "",
                                    TextLine: ""
                                })
                            }
                            Common.openLoadingDialog(that);
                            oParam = oParamInitParam;
                            oParam['N_ChangePOHdrTextParam'] = oParamDataPOHdr;
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
                                            MessageBox.information("No Details to be Deleted.");
                                            resolve()
                                        }
                                    },error: function(error){
                                        MessageBox.error(_captionList.INFO_ERROR);
                                        Common.closeLoadingDialog(that);
                                        //error message
                                        resolve()
                                    }
                                })
                            });
                            await _promiseResult;
                            
                            await this.loadAllData();
                            Common.closeLoadingDialog(that);
                        }else{
                            MessageBox.error(this.getView().getModel("captionMsg").getData()["INFO_NO_DATA_DELETE"]);
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
                        //     this.showLoadingDialog(_captionList.LOADING);
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

                            oParamInitParam = {
                                IPoNumber: poNo,
                                IDoDownload: "N",
                                IChangeonlyHdrplants: "N",
                            }
                            if(aDataToNotDelete.length > 0){
                                aDataToNotDelete.forEach(item=>{
                                    oParamDataPOHdr.push({
                                        PoNumber: poNo,
                                        PoItem: "00000",
                                        TextId: "F06",
                                        TextForm: "*",
                                        TextLine: item.Tdline
                                    })
                                });
                            }else{
                                oParamDataPOHdr.push({
                                    PoNumber: poNo,
                                    PoItem: "00000",
                                    TextId: "F06",
                                    TextForm: "",
                                    TextLine: ""
                                })
                            }

                            Common.openLoadingDialog(that);
                            oParam = oParamInitParam;
                            oParam['N_ChangePOHdrTextParam'] = oParamDataPOHdr;
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
                                            MessageBox.information("No Details to be Deleted.");
                                            resolve()
                                        }
                                    },error: function(error){
                                        MessageBox.error(_captionList.INFO_ERROR);
                                        Common.closeLoadingDialog(that);
                                        //error message
                                        resolve()
                                    }
                                })
                            });
                            await _promiseResult;
                            
                            await this.loadAllData();

                            Common.closeLoadingDialog(that);
                        }else{
                            MessageBox.error(this.getView().getModel("captionMsg").getData()["INFO_NO_DATA_DELETE"]);
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
                        //     this.showLoadingDialog(_captionList.LOADING);
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
                }else{
                    MessageBox.information(_captionList.INFO_PO_NOT_VALID_TO_EDIT)
                }
            },
            onCancelEditHdrTxt: async function(type){

                if(type === 'Remarks'){
                    this.byId("vpoNewHdrTxtRemarks").setVisible(true);
                    this.byId("vpoEditHdrTxtRemarks").setVisible(true);
                    this.byId("vpoDeleteHdrTxtRemarks").setVisible(true);
                    this.byId("vpoSaveHdrTxtRemarks").setVisible(false);
                    this.byId("vpoCancelHdrTxtRemarks").setVisible(false);

                    this.enableOtherTabs("idIconTabBarInlineMode");
                    this.enableOtherTabs("vpoDetailTab");

                    this.byId("vpoNewHdrTxtPkgInst").setEnabled(true);
                    this.byId("vpoEditHdrTxtPkgInst").setEnabled(true);
                    this.byId("vpoDeleteHdrTxtPkgInst").setEnabled(true);
                }
                if(type === 'PkgInst'){
                    this.byId("vpoNewHdrTxtPkgInst").setVisible(true);
                    this.byId("vpoEditHdrTxtPkgInst").setVisible(true);
                    this.byId("vpoDeleteHdrTxtPkgInst").setVisible(true);
                    this.byId("vpoSaveHdrTxtPkgInst").setVisible(false);
                    this.byId("vpoCancelHdrTxtPkgInst").setVisible(false);

                    this.enableOtherTabs("idIconTabBarInlineMode");
                    this.enableOtherTabs("vpoDetailTab");

                    this.byId("vpoNewHdrTxtRemarks").setEnabled(true);
                    this.byId("vpoEditHdrTxtRemarks").setEnabled(true);
                    this.byId("vpoDeleteHdrTxtRemarks").setEnabled(true);
                }
                await this.loadAllData();
            },

            onLoadFabSpecsData: async function(){
                var me = this;
                var poNo = this._pono;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                await new Promise((resolve, reject) => {
                    oModel.read("/VPOHDRTXTFABSPECSSet(PONO='" + poNo + "')", {
                        success: function (oData, oResponse) {
                            oData.SAMPSHIPDT = dateFormat.format(new Date(oData.SAMPSHIPDT) || "");
                            if(oData.PRODMONTHYR === "000000" || oData.PRODMONTHYR === "" || oData.PRODMONTHYR === null){
                                oData.PRODMONTHYR = "";
                            }
                            oJSONModel.setData(oData);
                            oView.setModel(oJSONModel, "hdrTxtFabSpecsData");
                            resolve();
                        },
                        error: function () {
                            reject();
                        }
                    })
                });
            },
            onLoadFabSpecsFieldsConfig: async function(){
                var me = this;
                var oModel = this.getOwnerComponent().getModel('ZGW_3DERP_SRV');
                var oView = this.getView();

                var oJSONModel1 = new JSONModel();
                var oJSONModel2 = new JSONModel();

                var vSBU = this._sbu;
                oModel.setHeaders({
                    sbu: vSBU,
                    type: 'FABSPECS',
                });

                await new Promise((resolve, reject)=>{
                    oModel.read("/DynamicColumnsSet", {
                        success: function (oData, oResponse) {
                            var visibleFields = {};
                            var editableFields ={};

                            for (var i = 0; i < oData.results.length; i++) {
                                visibleFields[oData.results[i].ColumnName] = oData.results[i].Visible;
                                editableFields[oData.results[i].ColumnName] = oData.results[i].Editable;
                            }

                            var JSONVisibleFieldsdata = JSON.stringify(visibleFields);
                            var JSONVisibleFieldsparse = JSON.parse(JSONVisibleFieldsdata);
                            oJSONModel1.setData(JSONVisibleFieldsparse);
                            oView.setModel(oJSONModel1, "VisibleFieldsData");

                            var JSONEditableFieldsdata = JSON.stringify(editableFields);
                            var JSONEditableFieldsparse = JSON.parse(JSONEditableFieldsdata);
                            oJSONModel2.setData(JSONEditableFieldsparse);
                            oView.setModel(oJSONModel2, "EditableFieldsData");

                            resolve();
                        },
                        error: function (err) {
                            // MessageBox.error(me.getView().getModel("captionMsg").getData()["INFO_ERROR"]);
                            reject();
                        }
                    });
                })
            },
            onEditFabSpecs: async function(){
                var me = this;
                var bProceed = true;
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
                    MessageBox.error(_captionList.INFO_PO_NOT_VALID_TO_EDIT)
                    bProceed = false;
                }

                if(bProceed){
                    await this.onLoadFabSpecsFieldsConfig();
                    this.byId("vpoEditHdrTxtFabSpec").setVisible(false);
                    this.byId("vpoSaveHdrTxtFabSpec").setVisible(true);
                    this.byId("vpoCancelHdrTxtFabSpec").setVisible(true);

                    this.byId("vpoHeaderTxtRemarksTab").setEnabled(false);
                    this.byId("vpoHeaderTxtPkngInstTab").setEnabled(false);

                    this.disableOtherTabs("idIconTabBarInlineMode");
                    this.disableOtherTabs("vpoDetailTab");
                }
                
            },
            onCancelEditFabSpecs: async function(){
                this.getView().setModel(new JSONModel(), "EditableFieldsData");
                this.byId("vpoEditHdrTxtFabSpec").setVisible(true);
                this.byId("vpoSaveHdrTxtFabSpec").setVisible(false);
                this.byId("vpoCancelHdrTxtFabSpec").setVisible(false);

                this.byId("vpoHeaderTxtRemarksTab").setEnabled(true);
                this.byId("vpoHeaderTxtPkngInstTab").setEnabled(true);

                this.enableOtherTabs("idIconTabBarInlineMode");
                this.enableOtherTabs("vpoDetailTab");
                await this.onLoadFabSpecsData();
            },
            onSaveEditFabSpecs: async function(){
                var me = this;

                var oView = this.getView();

                var oTable = this.byId("vpoDetailsTab");
                var oSelectedIndices = oTable.getBinding("rows").aIndices;
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;

                var oParamInitParam = {}
                var oParamDataPO = [];
                var oParamDataPOClose = [];
                var oParam = {};
                var rfcModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");

                var handFeel = this.byId("f1HandFeel").getValue();
                var shrinkage = this.byId("f1Shrinkage").getValue();
                var change = this.byId("f1Change").getValue();
                var stain = this.byId("f1Stain").getValue();
                var dry = this.byId("f1Dry").getValue();
                var colFastWash = this.byId("f1ColFastWash").getValue();
                var shipSampReq = this.byId("f1ShipSampReq").getValue();
                var sampShipDt = this.byId("f1SampShipDt").getValue();
                var prodMonthYr = this.byId("f1ProdMonthYr").getValue();
                var otherReq1 = this.byId("f1OtherReq1").getValue();
                var otherReq2 = this.byId("f1OtherReq2").getValue();
                var colFastCrWet = this.byId("f1ColFastCrWet").getValue();

                var topHeaderData = this.getView().getModel("topHeaderData").getData();

                var shipToPlant = topHeaderData.SHIPTOPLANT;//this.byId("f1ShipToPlant").getValue().split('-')[0].trim();
                var incoTerms = topHeaderData.INCOTERMS;//this.byId("f1Incoterms").getValue().split('-')[0].trim();
                var destination = topHeaderData.DEST;//this.byId("f1Destination").getValue();
                var shipMode = topHeaderData.SHIPMODE;//this.byId("f1ShipMode").getValue().split('-')[0].trim();
                
                var message = "";

                oSelectedIndices.forEach(item => {
                    oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                })
                oSelectedIndices = oTmpSelectedIndices;
                oSelectedIndices.forEach((item, index) => {
                    Common.openLoadingDialog(that);
                    if(aData.at(item).ITEM === "00010"){
                        oParamInitParam = {
                            IPoNumber: me._pono,
                            IDoDownload: "N",
                            IChangeonlyHdrplants: "N",
                        }
                        oParamDataPO.push({
                            Banfn: aData.at(item).PRNO, //PRNO
                            Bnfpo: aData.at(item).PRITM, //PRITM
                            Ebeln: me._pono,//pono
                            Unsez: shipToPlant, //shipToPlant
                            Inco1: incoTerms, // Incoterms
                            Inco2: destination, //Destination
                            Evers: shipMode, //ShipMode
                            Ebelp: aData.at(item).ITEM,//poitem
                            Txz01: aData.at(item).SHORTTEXT,//shorttext
                            Menge: aData.at(item).POQTY,//QTY
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
                            Zzhafe: handFeel,
                            Zzshnk: shrinkage,
                            Zzchng: change,
                            Zzstan: stain,
                            Zzdry: dry,
                            Zzshrq: shipSampReq,
                            Zzshda: sapDateFormat.format(new Date(sampShipDt)) + "T00:00:00",
                            Zzprmo: getMonth.format(new Date(prodMonthYr)),
                            Zzpryr: getYear.format(new Date(prodMonthYr)),
                            Zzreq1: otherReq1,
                            Zzreq2: otherReq2,
                            Zzcfwa: colFastWash,
                            Zzcfcw: colFastCrWet
                        });
                        oParamDataPOClose.push({
                            Banfn: aData.at(item).PRNO, //PRNO
                            Bnfpo: aData.at(item).PRITM, //PRITM
                            Ebakz: "" 
                        });
                    }
                });
                if (oParamDataPO.length > 0) {
                    oParam = oParamInitParam;
                    oParam['N_ChangePOItemParam'] = oParamDataPO;
                    oParam['N_ChangePOClosePRParam'] = oParamDataPOClose;
                    oParam['N_ChangePOReturn'] = [];
                    await new Promise((resolve, reject)=>{
                        rfcModel.create("/ChangePOSet", oParam, {
                            method: "POST",
                            success: function(oData, oResponse){
                                message = "";
                                if(oData.N_ChangePOReturn.results.length > 0){
                                    for(var errCount = 0; errCount <= oData.N_ChangePOReturn.results.length - 1; errCount++){
                                        message =+ oData.N_ChangePOReturn.results[errCount] === undefined ? "": oData.N_ChangePOReturn.results[errCount].Msgv1;
                                    }
                                }
                                MessageBox.information(message);
                                resolve();
                            },error: function(error){
                                //error message
                                MessageBox.error(error);
                                reject();
                            }
                        })
                    });
                }
                this.onLoadFabSpecsData();
                this.getView().setModel(new JSONModel(), "EditableFieldsData");
                this.byId("vpoEditHdrTxtFabSpec").setVisible(true);
                this.byId("vpoSaveHdrTxtFabSpec").setVisible(false);
                this.byId("vpoCancelHdrTxtFabSpec").setVisible(false);

                this.byId("vpoHeaderTxtRemarksTab").setEnabled(true);
                this.byId("vpoHeaderTxtPkngInstTab").setEnabled(true);

                this.enableOtherTabs("idIconTabBarInlineMode");
                this.enableOtherTabs("vpoDetailTab");
                Common.closeLoadingDialog(that);
            },

            onLoadHeaderConditions: async function(CONDREC){
                var oModel = this.getOwnerComponent().getModel();
                var me = this;
                var totalCondValue = 0;
                var oJSONModel = new JSONModel();
                return new Promise((resolve, reject)=>{
                    oModel.read('/VPOHDRCONDSet', { 
                        urlParameters: {
                            "$filter": "KNUMV eq '" + CONDREC + "'"
                        },
                        success: function (data, response) {
                            for (var i = 0; i < data.results.length; i++) {
                                totalCondValue += Number(data.results[i].CONDVAL);
                            }
                            me.getView().getModel("ui").setProperty("/totalCondValue", totalCondValue);
                            if (data.results.length > 0) {
                                oJSONModel.setData(data);
                            }
                            me.getView().setModel(oJSONModel, "VPOHdrCond");
                            resolve();
                        },
                        error: function (err) {
                            resolve();    
                        }
                    });
                });
            },

            onLoadHeaderOthInfo: async function(poNo){
                var oModel = this.getOwnerComponent().getModel();
                var me = this;
                var oJSONModel = new JSONModel();
                return new Promise((resolve, reject)=>{
                    oModel.read('/OthInfoSet', { 
                        urlParameters: {
                            "$filter": "EBELN eq '" + poNo + "'"
                        },
                        success: function (data, response) {
                            if (data.results.length > 0) {
                                data.results.forEach(item => {
                                    item.CREATEDDT = dateFormat.format(item.CREATEDDT) + " " + timeFormat.format(new Date(item.CREATEDTM.ms + TZOffsetMs));
                                    item.UPDATEDDT = dateFormat.format(item.UPDATEDDT) + " " + timeFormat.format(new Date(item.UPDATEDTM.ms + TZOffsetMs));
                                })
                                oJSONModel.setData(data.results);
                            }

                            //me.getView().setModel(oJSONModel, "othInfoData");
                            me.getView().getModel("othInfoData").setProperty("/", data.results);
                            me.getView().getModel("ui").setProperty("/othInfoDataEdit", false);
                            resolve();
                        },
                        error: function (err) {
                            resolve();    
                        }
                    });
                });
            },

            onLoadHeaderDownloadHist: async function(poNo){
                var oModel = this.getOwnerComponent().getModel();
                var me = this;
                var totalCondValue = 0;
                var oJSONModel = new JSONModel();
                return new Promise((resolve, reject)=>{
                    oModel.read('/VPOHISTHDRSet', { 
                        urlParameters: {
                            "$filter": "PONO eq '" + poNo + "'"
                        },
                        success: function (data, response) {
                            if (data.results.length > 0) {
                                data.results.forEach(item => {
                                    item.CREATEDDT = dateFormat.format(item.CREATEDDT) + " " + timeFormat.format(new Date(item.CREATEDTM.ms + TZOffsetMs));
                                    item.UPDATEDDT = dateFormat.format(item.UPDATEDDT) + " " + timeFormat.format(new Date(item.UPDATEDTM.ms + TZOffsetMs));
                                    item.RELDT = dateFormat.format(item.RELDT);
                                })
                                oJSONModel.setData(data);
                            }
                            me.getView().setModel(oJSONModel, "VPOHdrDownloadHist");
                            resolve();
                        },
                        error: function (err) {
                            resolve();    
                        }
                    });
                });
            },

            onRefreshDownloadHist: async function(){
                var poNo = this._pono;
                Common.openLoadingDialog(that);
                await this.onLoadHeaderDownloadHist(poNo)
                await this.setTableColumnsData("VPOHDRDOWNLOADHIST");
                Common.closeLoadingDialog(that);
            },

            validatePOChange: async function(){

                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var oEntitySet = "/ValidatePO_ChangeSet"
                var bProceed = true;

                this._validPOChange = 0;

                _promiseResult = new Promise((resolve, reject)=>{
                    oModel.read(oEntitySet, {
                        urlParameters: {
                            "$filter":"PO_Number eq '"+ this._pono +"'"
                        },
                        success: async function (data, response) {
                            if(data.results[0].WithGR !== "X"){
                                var count = me.getView().getModel("VPODtlsVPODet").getProperty("/results").length;
                                var itemCount = 0;
                                var isValidObj = [];

                                me.getView().getModel("VPODtlsVPODet").getProperty("/results").forEach(item => {

                                    if(item.DELETED === true || item.CLOSED === true){
                                        isValidObj.push({
                                            Deleted: item.DELETED,
                                            Closed: item.CLOSED
                                        });
                                        itemCount++
                                    }else{
                                        isValidObj.push({
                                            Deleted: item.DELETED,
                                            Closed: item.CLOSED
                                        })
                                        itemCount++
                                    }
                                    if(itemCount === count){
                                        var result = isValidObj.find(item => item.Deleted === false && item.Closed === false)
                                        if(result != undefined){
                                            if(result.Deleted === false && result.Closed === false){
                                                bProceed = true;
                                            }else{
                                                bProceed = false;
                                            }
                                        }else{
                                            bProceed = false;
                                        }
                                    }
                                })
                                if(bProceed){
                                    resolve(me._validPOChange = 1)
                                }else{
                                    resolve(me._validPOChange = 0)
                                }
                            }else{
                                resolve(me._validPOChange = 0)
                            }
                        },
                        error: function(error){
                            
                            resolve(me._validPOChange = 2)
                        }
                    })
                })
                await _promiseResult;
            },
            checkNetPriceIfEdittable: async function(mattyp){
                this._mattyp = 0; //Init
                var me = this;
                var vSBU = this._sbu;
                var oModel = this.getOwnerComponent().getModel();
                var oEntitySet = "/VPOCheckNetPrSet"
                _promiseResult = new Promise((resolve, reject)=>{
                    oModel.read(oEntitySet, {
                        urlParameters: {
                            "$filter":"FIELD2 eq '"+ mattyp +"' and SBU eq '"+ vSBU +"'"
                        },
                        success: async function (data, response) {
                            if(data.results.length > 0){
                                me._mattyp = 1;
                                resolve();
                            }else{
                                me._mattyp = 0
                                resolve();
                            }
                        },
                        error: function(error){
                            me._mattyp = 2
                            resolve();
                        }
                    })
                })
                await _promiseResult;
            },
            updateZERPPOUnlock: async function(){
                var me = this;
                var poNo = this._pono;
                var oModel = this.getOwnerComponent().getModel();
                var oEntitySet = "/VPOZPOUnlockSet(EBELN='"+ poNo +"')"

                _promiseResult = new Promise((resolve, reject)=>{
                    oModel.read(oEntitySet, {
                        // urlParameters: {
                        //     "$filter":"EBELN eq '7300001313'"
                        // },
                        success: async function (data, response) {
                            resolve();
                        },
                        error: function(error){
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
                var oJSONEdit = new JSONModel();
                var oJSONMandatory = new JSONModel();
                var oDataEDitModel = this.getView().getModel("topHeaderDataEdit"); 
                var oDataMandatoryModel = this.getView().getModel("topHeaderDataMandatory"); 
                var oDataEdit = oDataEDitModel.getProperty('/');
                var oDataMandatory = oDataMandatoryModel.getProperty('/');
                var bProceed = true
                var isValid = true

                var count = me.getView().getModel("VPODtlsVPODet").getProperty("/results").length;
                var itemCount = 0;
                var isValidObj = [];
                
                this.getView().getModel("VPODtlsVPODet").getProperty("/results").forEach(item => {

                    if(item.DELETED === true || item.CLOSED === true){
                        isValidObj.push({
                            Deleted: item.DELETED,
                            Closed: item.CLOSED
                        });
                        itemCount++
                    }else{
                        isValidObj.push({
                            Deleted: item.DELETED,
                            Closed: item.CLOSED
                        })
                        itemCount++
                    }
                    if(itemCount === count){
                        var result = isValidObj.find(item => item.Deleted === false && item.Closed === false)
                        if(result != undefined){
                            if(result.Deleted === false && result.Closed === false){
                                bProceed = true;
                            }else{
                                bProceed = false;
                            }
                        }else{
                            bProceed = false;
                        }
                    }
                    // if(bProceed){
                    //     if(isValid){
                    //         if(item.DELETED !== true){
                    //             bProceed = true;
                    //             isValid = true;
                    //         }else{
                    //             bProceed = false;
                    //             isValid = false;
                    //         }
                    //     }
                    // }
                })

                if(!isValid){
                    MessageBox.error(_captionList.INFO_PO_IS_DELETED)
                    return;
                }
                if(!bProceed){
                    MessageBox.error(_captionList.INFO_PO_CLOSED_DELETED)
                    return;
                }
                if(bProceed){
                    _promiseResult = new Promise((resolve, reject)=>{
                        resolve(me.validatePOChange());
                    })
                    await _promiseResult;

                    if(me._validPOChange !== 1){
                        oDataEdit.SHIPTOPLANT = true;//ShipToPlant
                        oDataMandatory.SHIPTOPLANT = true;//ShipToPlant
                    }else{
                        oDataEdit.SHIPTOPLANT = true;//ShipToPlant
                        oDataEdit.PAYMNTTERMS = true;//Payment Terms
                        oDataEdit.INCOTERMS = true;//IncoTerms
                        oDataEdit.DEST = true;//Destination

                        oDataMandatory.SHIPTOPLANT = true;//ShipToPlant
                        oDataMandatory.PAYMNTTERMS = true;//Payment Terms
                        oDataMandatory.INCOTERMS = true;//IncoTerms
                        oDataMandatory.DEST = true;//Destination
                    }
                    oJSONEdit.setData(oDataEdit);
                    oJSONMandatory.setData(oDataMandatory);
                
                    this.byId("vpoBtnEditHeader").setVisible(false);
                    this.byId("vpoBtnRefreshtHeader").setVisible(false);
                    this.byId("vpoBtnSaveHeader").setVisible(true);
                    this.byId("vpoBtnCancelHeader").setVisible(true);

                    this.disableOtherTabs("idIconTabBarInlineMode");
                    this.disableOtherTabs("vpoDetailTab");
                    this.byId("vpoHdrMenuBtn").setEnabled(false);

                    oView.setModel(oJSONEdit, "topHeaderDataEdit");
                    oView.setModel(oJSONMandatory, "topHeaderDataMandatory");
                    
                    this.setReqField(true);
                }
            },

            setReqField: function(isEdit){
                var oView = this.getView();
                var formView = this.getView().byId("POHeaderDetailForm1"); //Form View
                var formContainers = formView.getFormContainers(); // Form Container
                var formElements = ""; //Form Elements
                var formFields = ""; // Form Field
                var formElementsIsVisible = false; //is Form Element Visible Boolean
                var fieldMandatory = ""; // Field Mandatory variable
                var fieldIsMandatory = false; // Is Field Mandatory Boolean
                var oMandatoryModel = oView.getModel("topHeaderDataMandatory").getProperty("/");
                var label = "";

                //Form Validations
                //Iterate Form Containers
                for (var index in formContainers) {
                    formElements = formContainers[index].getFormElements(); //get Form Elements

                    //iterate Form Elements
                    for (var elementIndex in formElements) {
                        formElementsIsVisible = formElements[elementIndex].getProperty("visible"); //get the property Visible of Element
                        if (formElementsIsVisible) {
                            formFields = formElements[elementIndex].getFields(); //get FIelds in Form Element

                            //Iterate Fields
                            for (var formIndex in formFields) {
                                fieldMandatory = formFields[formIndex].getBindingInfo("value") === undefined ? "" : formFields[formIndex].getBindingInfo("value").mandatory;
                                fieldIsMandatory = oMandatoryModel[fieldMandatory] === undefined ? false : oMandatoryModel[fieldMandatory];
                                if (fieldIsMandatory) {
                                    if(isEdit){
                                        label = formElements[elementIndex].getLabel().replace("*", "");
                                        formElements[elementIndex].setLabel("*" + label);
                                        formElements[elementIndex]._oLabel.addStyleClass("requiredField");
                                    }else{
                                        label = formElements[elementIndex].getLabel().replace("*", "");
                                        formElements[elementIndex].setLabel(label);
                                        formElements[elementIndex]._oLabel.removeStyleClass("requiredField");
                                    }
                                }
                            }
                        }
                    }

                }

            },

            formatValueHelp: function(sValue, sPath, sKey, sText, sFormat) {
                console.log("formatValueHelp", sValue, sPath, sKey, sText, sFormat)
                if(this.getView().getModel(sPath) !== undefined){
                    if(this.getView().getModel(sPath).getData().length > 0){
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
                    }else return sValue;
                }
                
            },

            handleFormValueHelp: function (oEvent) {
                TableValueHelp.handleFormValueHelp(oEvent, this);
            },

            onHeaderInputChange: async function(oEvent){
                // if(oEvent.getParameters().value === oEvent.getSource().getBindingInfo("value").binding.oValue){
                //     this._headerIsEdited = false;
                // }else{
                //     this._headerIsEdited = true;
                // }
            },
            onInputLiveChangeSuggestion:async function(oEvent){
                var oSource = oEvent.getSource();
                var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
                var oMandatoryModel = this.getView().getModel("topHeaderDataMandatory").getProperty("/");

                oSource.setValueState(isInvalid ? "Error" : "None");
                oSource.setValueStateText("Invalid Entry");
                if(oSource.getSuggestionItems().length > 0){
                    oSource.getSuggestionItems().forEach(item => {
                        if (item.getProperty("key") === oSource.getSelectedKey() || item.getProperty("key") === oSource.getValue().trim()) {
                            isInvalid = false;
                            oSource.setValueState(isInvalid ? "Error" : "None");
                        }
                    })
                }else{
                    isInvalid = true;
                    oSource.setValueState(isInvalid ? "Error" : "None");
                    oSource.setValueStateText("Invalid Entry");
                }
    
                var fieldIsMandatory = oMandatoryModel[oEvent.getSource().getBindingInfo("value").mandatory] === undefined ? false : oMandatoryModel[oEvent.getSource().getBindingInfo("value").mandatory];
                if (fieldIsMandatory) {
                    if (oEvent.getParameters().value === "") {
                        isInvalid = true;
                        oSource.setValueState(isInvalid ? "Error" : "None");
                        oEvent.getSource().setValueStateText("Required Field");
                    }
                }
                if (isInvalid) {
                    this._validationErrors.push(oEvent.getSource().getId());
                }else {
                    var sModel = oSource.getBindingInfo("value").parts[0].model;
                    var sPath = oSource.getBindingInfo("value").parts[0].path;
                    this.getView().getModel(sModel).setProperty(sPath, oSource.getSelectedKey());
    
                    this._validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this._validationErrors.splice(index, 1)
                        }
                    })
                }
            },

            onSaveVPOHeader: async function(){
                var me = this;
                var oView = this.getView();
                var edditableFields = [];
                var oJSONEdit = new sap.ui.model.json.JSONModel();
                var oDataEDitModel = this.getView().getModel("topHeaderDataEdit"); 
                var oDataEdit = oDataEDitModel.getProperty('/');

                var topHeaderData = this.getView().getModel("topHeaderData").getData();

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

                var shipToPlant = topHeaderData.SHIPTOPLANT;//this.byId("f1ShipToPlant").getValue().split('-')[0].trim();
                var incoTerms = topHeaderData.INCOTERMS;//this.byId("f1Incoterms").getValue().split('-')[0].trim();
                var destination = topHeaderData.DEST;//this.byId("f1Destination").getValue();
                var shipMode = topHeaderData.SHIPMODE;//this.byId("f1ShipMode").getValue().split('-')[0].trim();
                var validPOItem;

                var boolProceed = true;

                this.vpoHeaderFormValidation; // form validation;

                if(this._validationErrors.length > 0){
                    MessageBox.error("Please Fill Required Fields!");
                    boolProceed = false
                }

                if(boolProceed){
                    Common.openLoadingDialog(that);
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
                        Evers: shipMode, //ShipMode
                        Ebelp: aData.at(validPOItem).ITEM,//poitem
                        Txz01: aData.at(validPOItem).SHORTTEXT,//shorttext
                        Menge: aData.at(validPOItem).POQTY,//QTY
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
                                        if(me._ediVendor === "L" && me._zpoUnlock === 1){
                                            me._updUnlock = 1;
                                        }
                                        MessageBox.information(message);
                                        resolve()
                                    }else{
                                        MessageBox.information(_captionList.INFO_NO_DTLS_TO_SAVE);
                                        resolve()
                                    }
                                },error: function(error){
                                    //error message
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

                    this.enableOtherTabs("idIconTabBarInlineMode");
                    this.enableOtherTabs("vpoDetailTab");
                    this.byId("vpoHdrMenuBtn").setEnabled(true);

                    oView.setModel(oJSONEdit, "topHeaderDataEdit");
                    this.setReqField(false);
                    await this.loadAllData()
                    if(this._ediVendor === "L" && this._updUnlock === 1){
                        //Update ZPOUnlock
                    }

                    this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                    
                    Common.closeLoadingDialog(that);
                }
            },

            vpoHeaderFormValidation: function(){
                var me = this;

                var oView = this.getView();
                var formView = this.getView().byId("POHeaderDetailForm1"); //Form View
                var formContainers = formView.getFormContainers(); // Form Container
                var formElements = ""; //Form Elements
                var formFields = ""; // Form Field
                var formElementsIsVisible = false; //is Form Element Visible Boolean
                var fieldIsEditable = false; // is Field Editable Boolean
                var fieldMandatory = ""; // Field Mandatory variable
                var fieldIsMandatory = false; // Is Field Mandatory Boolean
                var oMandatoryModel = oView.getModel("topHeaderDataMandatory").getProperty("/");
                //Form Validations
                //Iterate Form Containers
                for (var index in formContainers) {
                    formElements = formContainers[index].getFormElements(); //get Form Elements

                    //iterate Form Elements
                    for (var elementIndex in formElements) {
                        formElementsIsVisible = formElements[elementIndex].getProperty("visible"); //get the property Visible of Element
                        if (formElementsIsVisible) {
                            formFields = formElements[elementIndex].getFields(); //get FIelds in Form Element

                            //Iterate Fields
                            for (var formIndex in formFields) {
                                fieldMandatory = formFields[formIndex].getBindingInfo("value") === undefined ? "" : formFields[formIndex].getBindingInfo("value").mandatory;

                                fieldIsMandatory = oMandatoryModel[fieldMandatory] === undefined ? false : oMandatoryModel[fieldMandatory];

                                if (fieldIsMandatory) {
                                    fieldIsEditable = formFields[formIndex].getProperty("editable"); //get the property Editable of Fields
                                    if (fieldIsEditable) {
                                        if (formFields[formIndex].getValue() === "" || formFields[formIndex].getValue() === null || formFields[formIndex].getValue() === undefined) {
                                            formFields[formIndex].setValueState("Error");
                                            formFields[formIndex].setValueStateText("Required Field!");
                                            me._validationErrors.push(formFields[formIndex].getId())
                                        } 
                                        // else {
                                        // 	formFields[formIndex].setValueState("None");
                                        // 	me._validationErrors.forEach((item, index) => {
                                        // 		if (item === formFields[formIndex].getId()) {
                                        // 			me._validationErrors.splice(index, 1)
                                        // 		}
                                        // 	})
                                        // }
                                    }
                                }
                            }
                        }
                    }

                }
            },

            onCancelVPOHeader: async function(){
                var me = this;
                var oView = this.getView();
                var edditableFields = [];
                var oJSONEdit = new JSONModel();
                var actionSel;
                
                var oDataEDitModel = this.getView().getModel("topHeaderDataEdit"); 
                var oDataEdit = oDataEDitModel.getProperty('/');
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
                    Common.openLoadingDialog(this);
                    for (var oDatas in oDataEdit) {
                        //get only editable fields
                        edditableFields[oDatas] = false;
                    }
                    oJSONEdit.setData(edditableFields);

                    this.byId("vpoBtnEditHeader").setVisible(true);
                    this.byId("vpoBtnRefreshtHeader").setVisible(true);
                    this.byId("vpoBtnSaveHeader").setVisible(false);
                    this.byId("vpoBtnCancelHeader").setVisible(false);

                    this.enableOtherTabs("idIconTabBarInlineMode");
                    this.enableOtherTabs("vpoDetailTab");
                    this.byId("vpoHdrMenuBtn").setEnabled(true);
                    this.setReqField(false);
                    await this.loadAllData();
                    oView.setModel(oJSONEdit, "topHeaderDataEdit");
                    Common.closeLoadingDialog(this);

                }else if(actionSel === "Cancel"){
                    MessageBox.Action.CLOSE
                }
            },

            onChangeVendorVPOHeader: async function(){
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

                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
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
                }else{
                    MessageBox.error(_captionList.INFO_PO_NOT_VALID_TO_EDIT)
                }
            },
            onSaveVendorVPOHeader: async function(oEvent){
                var me = this;
                Common.openLoadingDialog(that);
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
                    MessageBox.error(_captionList.INFO_NEW_VENDORCD_EMPTY)
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
                                "ev_uname": "", 
                                "N_CT_BAPIRET2": [], 
                                "N_CT_UASCOND": [], 
                                "N_CT_UASPO": []
                            };
                            _promiseResult = new Promise((resolve, reject)=>{
                                rfcModel.create("/Get_PO_Change_VendorSet", changeVendorParam, {
                                    method: "POST",
                                    success: function(oData, oResponse) {
                                        if(oData.ifv_msgtyp === "E"){
                                            if(oData.iv_msgv1 !== "")
                                                message = oData.iv_msgtyp + " - No PO Created. "+ oData.iv_msgv1 +". ";
                                            MessageBox.error(message);
                                        }else{
                                            if(oData.iv_msgv1 !== "")
                                                message = "New PO created: "+ oData.iv_msgv1 +".";
                                            else
                                                message = oData.iv_msgtyp + " - No PO Created. "+ oData.iv_msgv1 +". ";
                                           
                                            MessageBox.information(message);
                                            me.changeVendorDialog.destroy(true);
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
                Common.closeLoadingDialog(that);
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

                var bProceed = true
                var isValid = true

                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
                    bProceed = false
                }

                var count = this.getView().getModel("VPODtlsVPODet").getProperty("/results").length;
                var itemCount = 0;
                var isValidObj = [];

                this.getView().getModel("VPODtlsVPODet").getProperty("/results").forEach(item => {

                    if(item.DELETED === true || item.CLOSED === true){
                        isValidObj.push({
                            Deleted: item.DELETED,
                            Closed: item.CLOSED
                        });
                        itemCount++
                    }else{
                        isValidObj.push({
                            Deleted: item.DELETED,
                            Closed: item.CLOSED
                        })
                        itemCount++
                    }
                    if(itemCount === count){
                        var result = isValidObj.find(item => item.Deleted === false && item.Closed === false)
                        if(result != undefined){
                            if(result.Deleted === false && result.Closed === false){
                                bProceed = true;
                            }else{
                                bProceed = false;
                            }
                        }else{
                            bProceed = false;
                        }
                    }
                    // if(bProceed){
                    //     if(isValid){
                    //         if(item.DELETED !== true && item.CLOSED !== true){
                    //             bProceed = true;
                    //             isValid = true;
                    //         }else{
                    //             bProceed = false;
                    //             isValid = false;
                    //         }
                    //     }
                    // }
                })

                var poNo = this._pono;

                var changeDlvDate = {};
                var changeDlvDateModel = new JSONModel();
                if(bProceed){
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
                }else{
                    MessageBox.error(_captionList.INFO_PO_NOT_VALID_TO_EDIT)
                }
            },
            onCancelChangeVPODelvDate: async function(){
                this.changeDlvDateDialog.destroy(true);
            },
            onSaveChangeVPODelvDate: async function(){
                var me = this;
                
                Common.openLoadingDialog(that);

                var oParamInitParam = {}
                // var oParamDataPO = [];
                var oParamDataPOSched =[]
                // var oParamDataPOClose = [];
                var oParam = {};
                var oModel = this.getOwnerComponent().getModel();
                var rfcModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var bProceed = true;

                var message;

                var oTmpSelectedIndices = [];
                var oTable = this.byId("vpoDetailsTab");
                var oSelectedIndices = oTable.getBinding("rows").aIndices;
                var aData = oTable.getModel().getData().rows;

                var topHeaderData = this.getView().getModel("topHeaderData").getData();
                
                // var shipToPlant = topHeaderData.SHIPTOPLANT;//this.byId("f1ShipToPlant").getValue().split('-')[0].trim();
                // var incoTerms = topHeaderData.INCOTERMS;//this.byId("f1Incoterms").getValue().split('-')[0].trim();
                // var destination = topHeaderData.DEST;//this.byId("f1Destination").getValue();
                // var shipMode = topHeaderData.SHIPMODE;//this.byId("f1ShipMode").getValue().split('-')[0].trim();
                // var validPOItem;

                var poNo = this.getView().getModel("ui").getProperty("/activePONo");

                var delSchedSet = [];

                if(this._newDlvDate === undefined || this._newDlvDate === "" || this._newDlvDate === null){
                    MessageBox.error(_captionList.INFO_DLVDT_EMPTY)
                    bProceed = false;
                }

                oSelectedIndices.forEach(item => {
                    oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                })
                oSelectedIndices = oTmpSelectedIndices;
                
                if(bProceed){
                    //get po Delivery Schedule Data
                    await new Promise((resolve, reject)=>{
                        oModel.read('/VPODelSchedSet', { 
                            urlParameters: {
                                "$filter": "PONO eq '" + poNo + "'"
                            },
                            success: function (data, response) {
                                if (data.results.length > 0) {
                                    data.results.forEach(item => {
                                        item.DELDT = dateFormat.format(item.DELDT);
                                        item.ETD = dateFormat.format(item.ETD);
                                        item.ETDPORT = dateFormat.format(item.ETDPORT);
                                        item.ETAFTY = dateFormat.format(item.ETAFTY);
                                        item.EXFTY = dateFormat.format(item.EXFTY);
                                        item.CREATEDDT = dateFormat.format(item.CREATEDDT);
                                        item.UPDATEDDT = dateFormat.format(item.UPDATEDDT);
                                        // item.DELETED = item.DELETED === "" ? false : true;
                                    })

                                    delSchedSet = data.results;
                                    delSchedSet.sort((a,b) => (a.ITEM > b.ITEM) ? 1 : ((b.ITEM > a.ITEM) ? -1 : 0));
                                }
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        });
                    });


                    oSelectedIndices.forEach((item, index) => {
                        if (aData.at(item).DELETED === false) {
                            
                            // var delSchedResult = delSchedSet.find(itemSched => itemSched.DELETED === false && new Date(itemSched.DELDT).toString() === new Date(aData.at(item).DELDT).toString())
                            
                            for(var x = 0; x < delSchedSet.length; x++){
                                if(delSchedSet[x].DELETED === false){
                                    if(aData.at(item).ITEM === delSchedSet[x].ITEM && new Date(delSchedSet[x].DELDT).toString() === new Date(aData.at(item).DELDT).toString()){
                                        oParamInitParam = {
                                            IPoNumber: poNo,
                                            IDoDownload: "N",
                                            IChangeonlyHdrplants: "N",
                                        }
                                        oParamDataPOSched.push({
                                            PoNumber: poNo,
                                            PoItem: delSchedSet[x].ITEM,
                                            SchedLine: delSchedSet[x].SEQNO,
                                            Quantity: delSchedSet[x].SCHEDQTY,
                                            DelivDate: sapDateFormat.format(new Date(this._newDlvDate)) + "T00:00:00", //DlvDt
                                            PreqNo: delSchedSet[x].PRNO,
                                            PreqItem: delSchedSet[x].PRITM
                                        })
                                    }
                                }
                            }

                            // console.log(delSchedResult)
                            // validPOItem = item;

                            // oParamInitParam = {
                            //     IPoNumber: poNo,
                            //     IDoDownload: "N",
                            //     IChangeonlyHdrplants: "N",
                            // }
                            // oParamDataPO.push({
                            //     Banfn: aData.at(validPOItem).PRNO, //PRNO
                            //     Bnfpo: aData.at(validPOItem).PRITM, //PRITM
                            //     Ebeln: this._pono,//pono
                            //     Unsez: shipToPlant, //shipToPlant
                            //     Inco1: incoTerms, // Incoterms
                            //     Inco2: destination, //Destination
                            //     Evers: shipMode, //ShipMode
                            //     Ebelp: aData.at(validPOItem).ITEM,//poitem
                            //     Txz01: aData.at(validPOItem).SHORTTEXT,//shorttext
                            //     Menge: aData.at(validPOItem).POQTY,//POQTY
                            //     Meins: aData.at(validPOItem).UOM,//UOM
                            //     Netpr: aData.at(validPOItem).NETPRICE,//net price
                            //     Peinh: aData.at(validPOItem).PER,//PER
                            //     Bprme: aData.at(validPOItem).ORDERPRICEUOM, //Order Price Unit
                            //     Repos: aData.at(validPOItem).INVRCPTIND, //IR Indicator
                            //     Webre: aData.at(validPOItem).GRBASEDIVIND, //GR Based Ind
                            //     Eindt: sapDateFormat.format(new Date(this._newDlvDate)) + "T00:00:00", //DlvDt
                            //     Uebtk: aData.at(validPOItem).UNLIMITED,//Unlimited
                            //     Uebto: aData.at(validPOItem).OVERDELTOL,//OverDel Tol.
                            //     Untto: aData.at(validPOItem).UNDERDELTOL,//UnderDel Tol.
                            //     Zzmakt: aData.at(validPOItem).POADDTLDESC, //PO Addtl Desc
                            //     Elikz: aData.at(validPOItem).CLOSED, //Closed
                            //     // Delete_Rec: aData.at(item).DELETED//Delete
                            // });
                            // oParamDataPOClose.push({
                            //     Banfn: aData.at(validPOItem).PRNO, //PRNO
                            //     Bnfpo: aData.at(validPOItem).PRITM, //PRITM
                            //     Ebakz: "" 
                            // });
                        }
                    });

                    if (oParamDataPOSched.length > 0) {
                        oParam = oParamInitParam;
                        oParam['N_ChangePOItemSchedParam'] = oParamDataPOSched;
                        oParam['N_ChangePOReturn'] = [];
                        _promiseResult = new Promise((resolve, reject)=>{
                            rfcModel.create("/ChangePOSet", oParam, {
                                method: "POST",
                                success: function(oData, oResponse){
                                    if(oData.N_ChangePOReturn.results.length > 0){
                                        if(oData.N_ChangePOReturn.results[0].Msgtyp === "E"){
                                            message = oData.N_ChangePOReturn.results[0].Msgv1;
                                            MessageBox.error(message);
                                            resolve()
                                        }else{
                                            me.changeDlvDateDialog.destroy(true);
                                            message = oData.N_ChangePOReturn.results[0].Msgv1;
                                            MessageBox.information(message);
                                            resolve()
                                        }
                                    }else{
                                        MessageBox.error(_captionList.INFO_NO_DTLS_TO_SAVE);
                                        resolve()
                                    }
                                },error: function(error){
                                    MessageBox.error(_captionList.INFO_ERROR);
                                    resolve()
                                }
                            })
                        });
                        await _promiseResult;
                    }
                }
                this.loadAllData()

                this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                Common.closeLoadingDialog(that);
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

                var topHeaderData = this.getView().getModel("topHeaderData").getData();

                var shipToPlant = topHeaderData.SHIPTOPLANT;//this.byId("f1ShipToPlant").getValue().split('-')[0].trim();
                var incoTerms = topHeaderData.INCOTERMS;//this.byId("f1Incoterms").getValue().split('-')[0].trim();
                var destination = topHeaderData.DEST;//this.byId("f1Destination").getValue();
                var shipMode = topHeaderData.SHIPMODE;//this.byId("f1ShipMode").getValue().split('-')[0].trim();

                var bProceed = true
                var isValid = true

                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
                    bProceed = false
                }

                var count = this.getView().getModel("VPODtlsVPODet").getProperty("/results").length;
                var itemCount = 0;
                var isValidObj = [];

                this.getView().getModel("VPODtlsVPODet").getProperty("/results").forEach(item => {

                    if(item.DELETED === true || item.CLOSED === true){
                        isValidObj.push({
                            Deleted: item.DELETED,
                            Closed: item.CLOSED
                        });
                        itemCount++
                    }else{
                        isValidObj.push({
                            Deleted: item.DELETED,
                            Closed: item.CLOSED
                        })
                        itemCount++
                    }
                    if(itemCount === count){
                        var result = isValidObj.find(item => item.Deleted === false && item.Closed === false)
                        if(result != undefined){
                            if(result.Deleted === false && result.Closed === false){
                                bProceed = true;
                            }else{
                                bProceed = false;
                            }
                        }else{
                            bProceed = false;
                        }
                    }
                    // if(bProceed){
                    //     if(isValid){
                    //         if(item.DELETED !== true && item.CLOSED !== true){
                    //             bProceed = true;
                    //             isValid = true;
                    //         }else{
                    //             bProceed = false;
                    //             isValid = false;
                    //         }
                    //     }
                    // }
                })

                if(!isValid){
                    MessageBox.error(_captionList.INFO_PO_CLOSED_DELETED)
                    return;
                }

                if(bProceed){
                    var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
                    _promiseResult = new Promise((resolve, reject) => {
                        MessageBox.information(
                            _captionList.CONF_PROCEED_DELETE_VPO,
                            {
                                actions: [_captionList.DELETE, MessageBox.Action.CLOSE],
                                styleClass: bCompact ? "sapUiSizeCompact" : "",
                                onClose: function(sAction) {
                                    actionSel = sAction;
                                    resolve(actionSel);
                                }
                            }
                        );
                    })
                    await _promiseResult;
                    if(actionSel === _captionList.DELETE){
                        Common.openLoadingDialog(that);
                        var oParamInitParam = {}
                        var oParamDataPO = [];
                        var oParamDataPOClose = [];
                        var oParam = {};
                        var oModel = this.getOwnerComponent().getModel();
                        var rfcModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                        bProceed = true;

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
                            MessageBox.error(_captionList.INFO_PO_ALREADY_RELEASED_CANCEL)
                            bProceed = false
                        }
                        
                        if(this._validPOChange != 1){
                            if(bProceed){
                                MessageBox.error(_captionList.INFO_PO_NOT_VALID_TO_DELETE)
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
                                        ICancel: "N",
                                    }
                                    oParamDataPO.push({
                                        Banfn: aData.at(validPOItem).PRNO, //PRNO
                                        Bnfpo: aData.at(validPOItem).PRITM, //PRITM
                                        Ebeln: this._pono,//pono
                                        Unsez: shipToPlant, //shipToPlant
                                        Inco1: incoTerms, // Incoterms
                                        Inco2: destination, //Destination
                                        Evers: shipMode, //ShipMode
                                        Ebelp: aData.at(validPOItem).ITEM,//poitem
                                        Txz01: aData.at(validPOItem).SHORTTEXT,//shorttext
                                        Menge: aData.at(validPOItem).POQTY,//QTY
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
                                _promiseResult = new Promise((resolve, reject)=>{
                                    rfcModel.create("/ChangePOSet", oParam, {
                                        method: "POST",
                                        success: async function(oData, oResponse){
                                            if(oData.N_ChangePOReturn.results.length > 0){
                                                if(oData.N_ChangePOReturn.results[0].Msgtyp === "E"){
                                                    message = oData.N_ChangePOReturn.results[0].Msgv1;
                                                    MessageBox.information(message);
                                                    resolve()
                                                }else{
                                                    message = oData.N_ChangePOReturn.results[0].Msgv1;
                                                    await new Promise((resolve, reject)=>{
                                                        resolve(me.loadAllData())
                                                    });
                                                    MessageBox.information(message);
                                                    resolve()
                                                }
                                            }else{
                                                MessageBox.error(_captionList.INFO_NO_DTLS_TO_DELETE);
                                                resolve()
                                            }
                                        },error: function(error){
                                            MessageBox.error(_captionList.INFO_ERROR);
                                            resolve()
                                        }
                                    })
                                });
                                await _promiseResult;
                            }
                            this.loadAllData()
                            this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                        }else{
                            MessageBox.error(_captionList.INFO_PO_NOT_VALID_TO_DELETE)
                        }
                        
                        Common.closeLoadingDialog(that);
                    }
                }else{
                   MessageBox.error(_captionList.INFO_PO_NOT_VALID_TO_EDIT)
                }
            },
            onCancelVPO: async function(){
                var me = this;
                var actionSel;
                var poNo = this._pono;

                var bProceed = true

                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
                    bProceed = false
                }

                if(bProceed){
                    var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
                    _promiseResult = new Promise((resolve, reject) => {
                        MessageBox.information(
                            _captionList.CONF_PROCEED_CANCEL_VPO,
                            {
                                actions: [_captionList.CANCELPO, MessageBox.Action.CLOSE],
                                styleClass: bCompact ? "sapUiSizeCompact" : "",
                                onClose: function(sAction) {
                                    actionSel = sAction;
                                    resolve(actionSel);
                                }
                            }
                        );
                    })
                    await _promiseResult;
                    if(actionSel === _captionList.CANCELPO){
                        var oParamInitParam = {}
                        var oParamDataPO = [];
                        var oParamDataPOClose = [];
                        var oParam = {};
                        var oModel = this.getOwnerComponent().getModel();
                        var rfcModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                        bProceed = true;

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
                        
                        if(this._validPOChange != 1){
                            if(bProceed){
                                MessageBox.error(_captionList.INFO_PO_NOT_VALID_TO_CANCEL)
                                bProceed = false;
                                return;
                            }    
                        }

                        if(frgke !== "G"){
                            MessageBox.error(_captionList.INFO_PO_NOT_YET_RELEASED_DELETE)
                            bProceed = false
                            return;
                        }

                        if(bProceed){
                            
                            Common.openLoadingDialog(that);
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
                                        ICancel: "Y",
                                    }
                                    oParamDataPO.push({
                                        Banfn: aData.at(validPOItem).PRNO, //PRNO
                                        Bnfpo: aData.at(validPOItem).PRITM, //PRITM
                                        Ebeln: this._pono,//pono
                                        Ebelp: aData.at(validPOItem).ITEM,//poitem
                                        Txz01: aData.at(validPOItem).SHORTTEXT,//shorttext
                                        Menge: aData.at(validPOItem).POQTY,//QTY
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
                                        DeleteRec: false//Delete
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
                                _promiseResult = new Promise((resolve, reject)=>{
                                    rfcModel.create("/ChangePOSet", oParam, {
                                        method: "POST",
                                        success: async function(oData, oResponse){
                                            if(oData.N_ChangePOReturn.results.length > 0){
                                                if(oData.N_ChangePOReturn.results[0].Msgtyp === "E"){
                                                    message = oData.N_ChangePOReturn.results[0].Msgv1;
                                                    MessageBox.information(message);
                                                    resolve()
                                                }else{
                                                    message = oData.N_ChangePOReturn.results[0].Msgv1;
                                                    await new Promise((resolve, reject)=>{
                                                        resolve(me.loadAllData())
                                                    });
                                                    MessageBox.information(message);
                                                    resolve()
                                                }
                                            }else{
                                                MessageBox.error(_captionList.INFO_NO_DTLS_TO_CANCEL);
                                                resolve()
                                            }
                                        },error: function(error){
                                            MessageBox.error(_captionList.INFO_ERROR);
                                            resolve()
                                        }
                                    })
                                });
                                await _promiseResult;
                            }
                            this.loadAllData()
                            this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                            Common.closeLoadingDialog(that);
                        }else{
                            MessageBox.error(_captionList.INFO_PO_NOT_VALID_TO_CANCEL)
                        }
                    }
                }else{
                    MessageBox.error(_captionList.INFO_PO_NOT_VALID_TO_EDIT)
                }
            },
            onSplitVPO: async function(){
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var bProceed = true
                
                Common.openProcessingDialog(this);

                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;           

                if (this._validPOChange != 1){
                    bProceed = false;
                    Common.closeProcessingDialog(this);
                }

                if (bProceed) {
                    bProceed = await this.getResource(this);

                    if (!bProceed) {
                        MessageBox.error(_captionList.ERR_GETTING_RESOURCES);
                        Common.closeProcessingDialog(this);
                        return;
                    }

                    //lock PO

                    
                    this.getOwnerComponent().getModel("UI_MODEL").setProperty("/sbu", this._sbu);
                    this.getOwnerComponent().getModel("UI_MODEL").setProperty("/pono", this._pono);

                    var oHeaderData = me.getView().getModel("topHeaderData").getData();
                    var aDetailData = this.byId("vpoDetailsTab").getModel().getData().rows.filter(fItem => fItem.DELETED === false && fItem.DELCOMPLETE === false);
                    
                    aDetailData.forEach(item => {
                        item.SPLITPOQTY = "",
                        item.INFOREC = ""
                    });

                    me.getOwnerComponent().getModel("SPLITPO_MODEL").setData({
                        header: oHeaderData,
                        detail: aDetailData
                    })

                    Common.closeProcessingDialog(this);

                    var oRouter = sap.ui.core.UIComponent.getRouterFor(me);
                    oRouter.navTo("RouteSplitPO");
                } 
                else {
                    MessageBox.error(_captionList.INFO_PO_NOT_VALID_TO_EDIT)
                }
            },

            onPOPrint: function(){
                var poNo = this._pono;
                var aPOItem = [];
                aPOItem.push({
                    "PONo": poNo
                });

                var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
                var hashUrl = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
                        target: {
                            semanticObject: "ZSO_POPRINT_PRVW",
                            action: "display"
                                },
                            params : aPOItem[0]
                        }));
                oCrossAppNavigator.toExternal({target: {shellHash: hashUrl}});
            },

            onUpdatePricePODtls: async function(){
                var me = this;
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
                    MessageBox.error(_captionList.INFO_PO_NOT_VALID_TO_EDIT)
                    return;
                }
                var oModel = this.getOwnerComponent().getModel();

                var oEntitySet = "/VPODetailsSet";

                var poNo;
                var oTable = this.byId("vpoDetailsTab");
                var aSelIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];

                var oParamInitParam = {}
                var oParamDataPO = [];
                var oParamDataPOClose = [];
                var oParam = {};
                var rfcModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");

                var aData = this._oDataBeforeChange.results != undefined? this._oDataBeforeChange.results : this.getView().getModel("VPODtlsVPODet").getData().results;
                var aDataToEdit = [];
                var iCounter = 0;
                var bProceed = true;

                var topHeaderData = this.getView().getModel("topHeaderData").getData();

                var shipToPlant = topHeaderData.SHIPTOPLANT;//this.byId("f1ShipToPlant").getValue().split('-')[0].trim();
                var incoTerms = topHeaderData.INCOTERMS;//this.byId("f1Incoterms").getValue().split('-')[0].trim();
                var destination = topHeaderData.DEST;//this.byId("f1Destination").getValue();
                var shipMode = topHeaderData.SHIPMODE;//this.byId("f1ShipMode").getValue().split('-')[0].trim();

                var message = "";

                if (aSelIndices.length > 0) {
                    Common.openLoadingDialog(that);
                    aSelIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    });

                    aSelIndices = oTmpSelectedIndices;
                    await new Promise((resolve, reject) => {
                       
                        for(var item in aSelIndices){
                            poNo = aData.at(item).PONO;

                            oModel.read(oEntitySet, {
                                urlParameters: {
                                    "$filter": "PONO eq '" + poNo + "'"
                                },
                                success: async function (data, response) {
                                    data.results.forEach(async dataItem => {
                                        if(aData.at(item).ITEM == dataItem.ITEM){
                                            iCounter++;
                                            if (aData.at(item).DELETED === false && (aData.at(item).CLOSED === false)) {
                                                bProceed = true;

                                                oParamInitParam = {
                                                    IPoNumber: me._pono,
                                                    IDoDownload: "N",
                                                    IChangeonlyHdrplants: "N",
                                                }
                                                oParamDataPO.push({
                                                    Banfn: aData.at(item).PRNO, //PRNO
                                                    Bnfpo: aData.at(item).PRITM, //PRITM
                                                    Ebeln: me._pono,//pono
                                                    Unsez: shipToPlant, //shipToPlant
                                                    Inco1: incoTerms, // Incoterms
                                                    Inco2: destination, //Destination
                                                    Evers: shipMode, //ShipMode
                                                    Ebelp: aData.at(item).ITEM,//poitem
                                                    Txz01: aData.at(item).SHORTTEXT,//shorttext
                                                    Menge: aData.at(item).POQTY,//QTY
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
                                                    Calctype: "B"
                                                    // Delete_Rec: aData.at(item).DELETED//Delete
                                                    
                                                });
                                                oParamDataPOClose.push({
                                                    Banfn: aData.at(item).PRNO, //PRNO
                                                    Bnfpo: aData.at(item).PRITM, //PRITM
                                                    Ebakz: "" 
                                                });
                                            }else{
                                                bProceed = false;
                                            }
                                            if(bProceed){
                                                if (aSelIndices.length === iCounter) {
                                                    if (oParamDataPO.length > 0) {
                                                        oParam = oParamInitParam;
                                                        oParam['N_ChangePOItemParam'] = oParamDataPO;
                                                        oParam['N_ChangePOClosePRParam'] = oParamDataPOClose;
                                                        oParam['N_ChangePOReturn'] = [];
                                                        _promiseResult = new Promise((resolve, reject)=>{
                                                            rfcModel.create("/ChangePOSet", oParam, {
                                                                method: "POST",
                                                                success: async function(oData, oResponse){
                                                                    if(oData.N_ChangePOReturn.results[0].Msgtyp === 'E'){
                                                                        message = oData.N_ChangePOReturn.results[0].Msgv1;
                                                                        MessageBox.error(message);
                                                                        resolve()
                                                                    }else{
                                                                        message = oData.N_ChangePOReturn.results[0].Msgv1;
                                                                        MessageBox.information(message);
                                                                        await new Promise((resolve, reject)=>{
                                                                            resolve(me.loadAllData())
                                                                        });
                                                                        resolve()
                                                                    }   
                                                                },error: function(error){
                                                                    MessageBox.error(error);
                                                                    reject();
                                                                }
                                                            })
                                                        });
                                                        await _promiseResult;
                                                        resolve();
                                                    }
                                                }
                                            }
                                        }
                                    });
                                },error: function(error){
        
                                }
                            });
                        }   
                    })
                    Common.closeLoadingDialog(that);
                }
            },

            onEditPODtls: async function(){
                // if(this.getView().getModel("ui").getData().dataMode === 'EDIT'){
                //     return;
                // }
                // if(this.getView().getModel("ui").getData().dataMode === 'NODATA'){
                //     return;
                // }
                // this.showLoadingDialog(_captionList.LOADING);
                
                var me = this;
                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
                    MessageBox.error(_captionList.INFO_PO_NOT_VALID_TO_EDIT)
                    return;
                }
                var oModel = this.getOwnerComponent().getModel();
                oModel.setUseBatch(true);
                oModel.setDeferredGroups(["insert"]);
                var modelParameter = {
                    "groupId": "insert"
                };
                var oEntitySet = "/VPODetailsSet";

                var poNo;
                var oTable = this.byId("vpoDetailsTab");
                var aSelIndices = oTable.getSelectedIndices();
                var oSelectedIndices = oTable.getBinding("rows").aIndices;
                var oTmpSelectedIndices = [];

                var aData = this._oDataBeforeChange.results != undefined? this._oDataBeforeChange.results : this.getView().getModel("VPODtlsVPODet").getData().results;
                var aDataToEdit = [];
                var iCounter = 0;
                var bProceed = true;
                var oParamPODATA = [];

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
                                data.results.forEach(async dataItem => {
                                    if(aData.at(item).ITEM == dataItem.ITEM){
                                        iCounter++;
                                        if (aData.at(item).DELETED === false && (aData.at(item).CLOSED === false)) {
                                            bProceed = true;
                                            aDataToEdit.push(aData.at(item));
                                            
                                            //Check if Net Price is Editable
                                            await me.checkNetPriceIfEdittable(aData.at(item).MATTYP);
                                            if(me._mattyp == 1){
                                                aDataToEdit[iCounter-1].NetPREdit = true;
                                                aDataToEdit[iCounter-1].Per = true;
                                            }else if(me._mattyp == 0){
                                                aDataToEdit[iCounter-1].NetPREdit = false;
                                                aDataToEdit[iCounter-1].Per = false;
                                            }else if(me._mattyp == 2){
                                                bProceed = false
                                            }

                                            // oParamPODATA  = {
                                            //     EBELN:          poNo,
                                            //     EBELP:          aData.at(item).ITEM,
                                            //     WEMNG:          "0",
                                            //     FOCQTY:         "0",
                                            //     TOLALLOWEDIT:   "",
                                            //     QTYMIN:         "0",
                                            //     QTYMAX:         "0",
                                            //     UNTTOMIN:       "0",
                                            //     UNTTOMAX:       "0",
                                            //     UEBTOMIN:       "0",
                                            //     UEBTOMAX:       "0"
                                            // }
                                            // oModel.create("/PODATASet", oParamPODATA, modelParameter);
                                            // console.log(oParamPODATA);
                                            // _promiseResult = new Promise((resolve, reject)=>{
                                            //     oModel.submitChanges({
                                            //         groupId: "insert",
                                            //         success: function(oData, oResponse){
                                            //             console.log(oData);
                                            //             resolve();
                                            //         },error: function(error){
                                            //             MessageBox.error(error);
                                            //             resolve();
                                            //         }
                                            //     })
                                            // });
                                            // await _promiseResult;
                                        }else{
                                            bProceed = false;
                                        }
                                        //Check if PO Quantity is Editable
                                        if(aDataToEdit.length > 0){
                                            if(aData.at(item).DELCOMPLETE === true){
                                                aDataToEdit[iCounter-1].POQtyEdit = false;
                                            }else{
                                                aDataToEdit[iCounter-1].POQtyEdit = true;
                                            }
                                        }

                                        if(bProceed){
                                            if (aSelIndices.length === iCounter) {
                                                me._oDataBeforeChange = me.getView().getModel("VPODtlsVPODet").getProperty("/results");
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

                                                me.byId("vpoBtnUpdatePrice").setVisible(false);
                                                me.byId("vpoBtnDelCompleteDetails").setVisible(false);

                                                me.disableOtherTabsChild("idIconTabBarInlineMode");
                                                me.disableOtherTabsChild("vpoHeaderTxtIconTab");
                                                me.byId("vpoDelSchedIconTab").setEnabled(false);
                                                me.byId("vpoDelInvIconTab").setEnabled(false);
                                                me.byId("vpoPoHistIconTab").setEnabled(false);
                                                me.byId("vpoConditionsIconTab").setEnabled(false);
                                                me.byId("vpoReceiptsIssuancesIconTab").setEnabled(false);

                                                // me.byId("vpoNewHdrTxtRemarks").setEnabled(false);
                                                // me.byId("vpoEditHdrTxtRemarks").setEnabled(false);
                                                // me.byId("vpoDeleteHdrTxtRemarks").setEnabled(false);

                                                // me.byId("vpoHdrMenuBtn").setEnabled(false);
                                                // me.byId("vpoBtnEditHeader").setEnabled(false);
                                                // me.byId("vpoBtnRefreshtHeader").setEnabled(false);

                                                // me.byId("vpoNewHdrTxtPkgInst").setEnabled(false);
                                                // me.byId("vpoEditHdrTxtPkgInst").setEnabled(false);
                                                // me.byId("vpoDeleteHdrTxtPkgInst").setEnabled(false);
                                                
                                                
                                                me.onRowEditPO("vpoDetailsTab", "VPODTLSColumnsVPODet");
                                                
                                                me.getView().getModel("ui").setProperty("/dataMode", 'EDIT');
                                                
                                            }
                                        }else{
                                            MessageBox.error(_captionList.INFO_PO_CLOSED_DELETED);
                                        }
                                    }
                                });
                                
                            },error: function(error){
    
                            }
                        });
                    });
                    
                }else{
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })
                    oSelectedIndices = oTmpSelectedIndices;
                    oSelectedIndices.forEach((item, index) => {
                        poNo = aData.at(item).PONO

                        oModel.read(oEntitySet, {
                            urlParameters: {
                                "$filter": "PONO eq '" + poNo + "'"
                            },
                            success: async function (data, response) {
                                data.results.forEach(async dataItem => {
                                    if(aData.at(item).ITEM == dataItem.ITEM){
                                        iCounter++;
                                        if (aData.at(item).DELETED === false && (aData.at(item).CLOSED === false)) {
                                            bProceed = true;
                                            aDataToEdit.push(aData.at(item));
                                            
                                            //Check if Net Price is Editable
                                            await me.checkNetPriceIfEdittable(aData.at(item).MATTYP);
                                            if(me._mattyp == 1){
                                                aDataToEdit[iCounter-1].NetPREdit = true;
                                                aDataToEdit[iCounter-1].Per = true;
                                            }else if(me._mattyp == 0){
                                                aDataToEdit[iCounter-1].NetPREdit = false;
                                                aDataToEdit[iCounter-1].Per = false;
                                            }else if(me._mattyp == 2){
                                                bProceed = false
                                            }

                                            // oParamPODATA  = {
                                            //     EBELN:          poNo,
                                            //     EBELP:          aData.at(item).ITEM,
                                            //     WEMNG:          "0",
                                            //     FOCQTY:         "0",
                                            //     TOLALLOWEDIT:   "",
                                            //     QTYMIN:         "0",
                                            //     QTYMAX:         "0",
                                            //     UNTTOMIN:       "0",
                                            //     UNTTOMAX:       "0",
                                            //     UEBTOMIN:       "0",
                                            //     UEBTOMAX:       "0"
                                            // }
                                            // oModel.create("/PODATASet", oParamPODATA, modelParameter);
                                            // console.log(oParamPODATA);
                                            // _promiseResult = new Promise((resolve, reject)=>{
                                            //     oModel.submitChanges({
                                            //         groupId: "insert",
                                            //         success: function(oData, oResponse){
                                            //             console.log(oData);
                                            //             resolve();
                                            //         },error: function(error){
                                            //             MessageBox.error(error);
                                            //             resolve();
                                            //         }
                                            //     })
                                            // });
                                            // await _promiseResult;
                                        }else{
                                            bProceed = false;
                                        }
                                        //Check if PO Quantity is Editable
                                        if(aDataToEdit.length > 0){
                                            if(aData.at(item).DELCOMPLETE === true){
                                                aDataToEdit[iCounter-1].POQtyEdit = false;
                                            }else{
                                                aDataToEdit[iCounter-1].POQtyEdit = true;
                                            }
                                        }

                                        if(bProceed){
                                            if (oSelectedIndices.length === iCounter) {
                                                me._oDataBeforeChange = me.getView().getModel("VPODtlsVPODet").getProperty("/results");
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

                                                me.byId("vpoBtnUpdatePrice").setVisible(false);
                                                me.byId("vpoBtnDelCompleteDetails").setVisible(false);

                                                me.disableOtherTabsChild("idIconTabBarInlineMode");
                                                me.disableOtherTabsChild("vpoHeaderTxtIconTab");
                                                me.byId("vpoDelSchedIconTab").setEnabled(false);
                                                me.byId("vpoDelInvIconTab").setEnabled(false);
                                                me.byId("vpoPoHistIconTab").setEnabled(false);
                                                me.byId("vpoConditionsIconTab").setEnabled(false);
                                                me.byId("vpoReceiptsIssuancesIconTab").setEnabled(false);

                                                // me.byId("vpoNewHdrTxtRemarks").setEnabled(false);
                                                // me.byId("vpoEditHdrTxtRemarks").setEnabled(false);
                                                // me.byId("vpoDeleteHdrTxtRemarks").setEnabled(false);

                                                // me.byId("vpoHdrMenuBtn").setEnabled(false);
                                                // me.byId("vpoBtnEditHeader").setEnabled(false);
                                                // me.byId("vpoBtnRefreshtHeader").setEnabled(false);

                                                // me.byId("vpoNewHdrTxtPkgInst").setEnabled(false);
                                                // me.byId("vpoEditHdrTxtPkgInst").setEnabled(false);
                                                // me.byId("vpoDeleteHdrTxtPkgInst").setEnabled(false);
                                                
                                                
                                                me.onRowEditPO("vpoDetailsTab", "VPODTLSColumnsVPODet");
                                                
                                                me.getView().getModel("ui").setProperty("/dataMode", 'EDIT');
                                                
                                            }
                                        }else{
                                            MessageBox.error(_captionList.INFO_PO_CLOSED_DELETED);
                                        }
                                    }
                                });
                                
                            },error: function(error){
    
                            }
                        });
                    })
                    // MessageBox.error(this.getView().getModel("captionMsg").getData()["INFO_NO_DATA_EDIT"]);

                }

            },
            onRowEditPO: async function(table, model){
                var me = this;
                // this.getView().getModel(model).getData().results.forEach(item => item.Edited = false);
                var oTable = this.byId(table);

                var oColumnsModel = this.getView().getModel(model);
                var oColumnsData = oColumnsModel.getProperty('/');
                
                if(table === "vpoDetailsTab"){
                    var oData =  this.getView().getModel("VPODtlsVPODet").getProperty('/results');
                    
                    oData.forEach((col, idx)=>{
                        if(!col.NetPREdit){
                            oTable.getColumns().forEach((col, idx) => {
                                oColumnsData.filter(item => item.ColumnName === col.sId.split("-")[1])
                                    .forEach(ci => {
                                        var sColumnType = ci.DataType;
                                        if(ci.ColumnName === "NETPRICE"){
                                            ci.Editable = false;
                                        }
                                        if(ci.ColumnName === "PER"){
                                            ci.Editable = false;
                                        }
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
                                                    change: this.onInputLiveChange.bind(this),
                                                    liveChange: this.onInputLiveChange.bind(this)
                                                }));
                                            }else if (sColumnType === "NUMBER"){
                                                col.setTemplate(new sap.m.Input({
                                                    // id: "ipt" + ci.name,
                                                    type: sap.m.InputType.Number,
                                                    value: "{path:'" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"', type:'sap.ui.model.type.Decimal', formatOptions:{ minFractionDigits:" + null + ", maxFractionDigits:" + null + " }, constraints:{ precision:" + ci.Decimal + ", scale:" + null + " }}",
                                                    
                                                    maxLength: +ci.Length,
                                                
                                                    liveChange: this.onNumberLiveChange.bind(this)
                                                }));
                                            }
                                        }
                                    });
                            });
                        }else if(!col.POQtyEdit){
                            oTable.getColumns().forEach((col, idx) => {
                                oColumnsData.filter(item => item.ColumnName === col.sId.split("-")[1])
                                    .forEach(ci => {
                                        var sColumnType = ci.DataType;
                                        if(ci.ColumnName === "POQTY"){
                                            ci.Editable = false;
                                        }
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
                                                    change: this.onInputLiveChange.bind(this),
                                                    liveChange: this.onInputLiveChange.bind(this)
                                                }));
                                            }else if (sColumnType === "NUMBER"){
                                                col.setTemplate(new sap.m.Input({
                                                    // id: "ipt" + ci.name,
                                                    type: sap.m.InputType.Number,
                                                    value: "{path:'" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"', type:'sap.ui.model.type.Decimal', formatOptions:{ minFractionDigits:" + null + ", maxFractionDigits:" + null + " }, constraints:{ precision:" + ci.Decimal + ", scale:" + null + " }}",
                                                    
                                                    maxLength: +ci.Length,
                                                
                                                    liveChange: this.onNumberLiveChange.bind(this)
                                                }));
                                            }
                                        }
                                    });
                            });
                        }else{
                            oTable.getColumns().forEach((col, idx) => {
                                oColumnsData.filter(item => item.ColumnName === col.sId.split("-")[1])
                                    .forEach(ci => {
                                        var sColumnType = ci.DataType;
                                        if(ci.ColumnName === "NETPRICE"){
                                            ci.Editable = true;
                                        }
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
                                                    change: this.onInputLiveChange.bind(this),
                                                    liveChange: this.onInputLiveChange.bind(this)
                                                }));
                                            }else if (sColumnType === "NUMBER"){
                                                col.setTemplate(new sap.m.Input({
                                                    // id: "ipt" + ci.name,
                                                    type: sap.m.InputType.Number,
                                                    value: "{path:'" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"', type:'sap.ui.model.type.Decimal', formatOptions:{ minFractionDigits:" + null + ", maxFractionDigits:" + null + " }, constraints:{ precision:" + ci.Decimal + ", scale:" + null + " }}",
                                                    
                                                    maxLength: +ci.Length,
                                                
                                                    liveChange: this.onNumberLiveChange.bind(this)
                                                }));
                                            }
                                        }
                                    });
                            });
                        }
                    })
                }else if(table === "vpoDelSchedTab"){
                    var oData =  this.getView().getModel("VPODelSchedVPODet").getProperty('/results');
                    oData.forEach((col, idx)=>{
                        if(Number(col.GRQTY) !== 0){
                            oTable.getColumns().forEach((col, idx) => {
                                oColumnsData.filter(item => item.ColumnName === col.sId.split("-")[1])
                                    .forEach(ci => {
                                        var sColumnType = ci.DataType;
                                        if(ci.ColumnName === "ASNNO"){
                                            ci.Editable = false;
                                        }
                                        if(ci.ColumnName === "ASNQTY"){
                                            ci.Editable = false;
                                        }
                                        if(ci.ColumnName === "ETD"){
                                            ci.Editable = false;
                                        }
                                        if(ci.ColumnName === "ETDPORT"){
                                            ci.Editable = false;
                                        }
                                        if(ci.ColumnName === "ETAFTY"){
                                            ci.Editable = false;
                                        }
                                        if(ci.ColumnName === "EXFTY"){
                                            ci.Editable = false;
                                        }
                                        if(ci.ColumnName === "SHIPMODE"){
                                            ci.Editable = false;
                                        }
                                        if(ci.ColumnName === "REMARKS"){
                                            ci.Editable = false;
                                        }
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
                                                    change: this.onInputLiveChange.bind(this),
                                                    liveChange: this.onInputLiveChange.bind(this)
                                                }));
                                            }else if (sColumnType === "NUMBER"){
                                                col.setTemplate(new sap.m.Input({
                                                    // id: "ipt" + ci.name,
                                                    type: sap.m.InputType.Number,
                                                    value: "{path:'" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"', type:'sap.ui.model.type.Decimal', formatOptions:{ minFractionDigits:" + null + ", maxFractionDigits:" + null + " }, constraints:{ precision:" + ci.Decimal + ", scale:" + null + " }}",
                                                    
                                                    maxLength: +ci.Length,
                                                
                                                    liveChange: this.onNumberLiveChange.bind(this)
                                                }));
                                            }
                                        }
                                    });
                            });
                        }else if(!col.POQtyEdit){
                            oTable.getColumns().forEach((col, idx) => {
                                oColumnsData.filter(item => item.ColumnName === col.sId.split("-")[1])
                                    .forEach(ci => {
                                        var sColumnType = ci.DataType;
                                        if(ci.ColumnName === "POQTY"){
                                            ci.Editable = false;
                                        }
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
                                                    change: this.onInputLiveChange.bind(this),
                                                    liveChange: this.onInputLiveChange.bind(this)
                                                }));
                                            }else if (sColumnType === "NUMBER"){
                                                col.setTemplate(new sap.m.Input({
                                                    // id: "ipt" + ci.name,
                                                    type: sap.m.InputType.Number,
                                                    value: "{path:'" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"', type:'sap.ui.model.type.Decimal', formatOptions:{ minFractionDigits:" + null + ", maxFractionDigits:" + null + " }, constraints:{ precision:" + ci.Decimal + ", scale:" + null + " }}",
                                                    
                                                    maxLength: +ci.Length,
                                                
                                                    liveChange: this.onNumberLiveChange.bind(this)
                                                }));
                                            }
                                        }
                                    });
                            });
                        }else{
                            oTable.getColumns().forEach((col, idx) => {
                                oColumnsData.filter(item => item.ColumnName === col.sId.split("-")[1])
                                    .forEach(ci => {
                                        var sColumnType = ci.DataType;
                                        if(ci.ColumnName === "NETPRICE"){
                                            ci.Editable = true;
                                        }
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
                                                    change: this.onInputLiveChange.bind(this),
                                                    liveChange: this.onInputLiveChange.bind(this)
                                                }));
                                            }else if (sColumnType === "NUMBER"){
                                                col.setTemplate(new sap.m.Input({
                                                    // id: "ipt" + ci.name,
                                                    type: sap.m.InputType.Number,
                                                    value: "{path:'" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"', type:'sap.ui.model.type.Decimal', formatOptions:{ minFractionDigits:" + null + ", maxFractionDigits:" + null + " }, constraints:{ precision:" + ci.Decimal + ", scale:" + null + " }}",
                                                    
                                                    maxLength: +ci.Length,
                                                
                                                    liveChange: this.onNumberLiveChange.bind(this)
                                                }));
                                            }
                                        }
                                    });
                            });
                        }
                    })
                }else{
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
                                            change: this.onInputLiveChange.bind(this),
                                            liveChange: this.onInputLiveChange.bind(this)
                                        }));
                                    }else if (sColumnType === "NUMBER"){
                                        col.setTemplate(new sap.m.Input({
                                            // id: "ipt" + ci.name,
                                            type: sap.m.InputType.Number,
                                            value: "{path:'" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"', type:'sap.ui.model.type.Decimal', formatOptions:{ minFractionDigits:" + null + ", maxFractionDigits:" + null + " }, constraints:{ precision:" + ci.Decimal + ", scale:" + null + " }}",
                                            
                                            maxLength: +ci.Length,
                                        
                                            liveChange: this.onNumberLiveChange.bind(this)
                                        }));
                                    }
                                }
                            });
                    });
                }
            },
            onInputLiveChange: function(oEvent){
                if(oEvent.getSource().getBindingInfo("value").mandatory){
                    if(oEvent.getParameters().value === ""){
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Required Field");
                        this._validationErrors.push(oEvent.getSource().getId());
                    }else{
                        oEvent.getSource().setValueState("None");
                        this._validationErrors.forEach((item, index) => {
                            if (item === oEvent.getSource().getId()) {
                                this._validationErrors.splice(index, 1)
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
                        this._validationErrors.push(oEvent.getSource().getId());
                    }else{
                        oEvent.getSource().setValueState("None");
                        this._validationErrors.forEach((item, index) => {
                            if (item === oEvent.getSource().getId()) {
                                this._validationErrors.splice(index, 1)
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

                var oTable = this.byId("vpoDetailsTab");
                var oSelectedIndices = oTable.getBinding("rows").aIndices;
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;
                var oParamInitParam = {}
                var oParamDataPO = [];
                var oParamDataPOClose = [];
                var oParam = {};
                var rfcModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var bProceed = true;
                
                var topHeaderData = this.getView().getModel("topHeaderData").getData();

                var shipToPlant = topHeaderData.SHIPTOPLANT;//this.byId("f1ShipToPlant").getValue().split('-')[0].trim();
                var incoTerms = topHeaderData.INCOTERMS;//this.byId("f1Incoterms").getValue().split('-')[0].trim();
                var destination = topHeaderData.DEST;//this.byId("f1Destination").getValue();
                var shipMode = topHeaderData.SHIPMODE;//this.byId("f1ShipMode").getValue().split('-')[0].trim();
            
                if (this._validationErrors.length != 0){
                    MessageBox.error(_captionList.INFO_REQUIRED_FIELD);
                    bProceed = false;
                }

                var message;
                if(bProceed){
                    Common.openLoadingDialog(that);
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
                            Unsez: shipToPlant, //shipToPlant
                            Inco1: incoTerms, // Incoterms
                            Inco2: destination, //Destination
                            Evers: shipMode, //ShipMode
                            Ebelp: aData.at(item).ITEM,//poitem
                            Txz01: aData.at(item).SHORTTEXT,//shorttext
                            Menge: aData.at(item).POQTY,//QTY
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
                        });
                    });

                    await me.getPOTOlerance(aData, oSelectedIndices);
                    if (oParamDataPO.length > 0) {
                        oParam = oParamInitParam;
                        oParam['N_ChangePOItemParam'] = oParamDataPO;
                        oParam['N_ChangePOClosePRParam'] = oParamDataPOClose;
                        oParam['N_ChangePOReturn'] = [];
                        _promiseResult = new Promise((resolve, reject)=>{
                            rfcModel.create("/ChangePOSet", oParam, {
                                method: "POST",
                                success: function(oData, oResponse){
                                    message = ""
                                    if(oData.N_ChangePOReturn.results.length > 0){
                                        var oParam = {};
                                        for(var errCount = 0; errCount <= oData.N_ChangePOReturn.results.length - 1; errCount++){
                                            message =+ oData.N_ChangePOReturn.results[errCount] === undefined ? "": oData.N_ChangePOReturn.results[errCount].Msgv1;
                                            if (oData.N_ChangePOReturn.results[errCount].Msgtyp === 'S') {
                                                var oModel = me.getOwnerComponent().getModel();
                                                _promiseResult = new Promise((resolve, reject) => {
                                                    oModel.read('/VPOCurrentRelGrpStatSet', {
                                                        urlParameters: {
                                                            "$filter": "EBELN eq '" + me._pono + "'"
                                                        },
                                                        success: function (data, response) {
                                                            if ((me.getView().getModel("topHeaderData").getData().EDIVENDOR === "L" ? true : false) && (data.results[0].FRGGR === me.getView().getModel("relStratData").getData().RELGRP) && (data.results[0].FRGSX === me.getView().getModel("relStratData").getData().RELSTRAT) && (data.results[0].FRGKE === "1")) {
                                                                sap.m.MessageBox.confirm("PO has been changed but release was not reset. Do you want this PO downloaded to the vendor?", {
                                                                    actions: ["Yes", "No"],
                                                                    onClose: function (sAction) {
                                                                        if (sAction === "Yes") {
                                                                            oParam = {
                                                                                "EBELN": me._pono,
                                                                                "EDI": "X",
                                                                                "DOWNLOAD": ""
                                                                            }
                                                                            var oEntitySet = "/VPODownloadedSet(EBELN='" + me._pono + "')";
                                                                            oModel.update(oEntitySet, oParam, {
                                                                                method: "PUT",
                                                                                success: function (data, oResponse) {
                                                                                    resolve(me.onSaveChanges(oParam));
                                                                                    resolve();
                                                                                },
                                                                                error: function (err) {
                                                                                    console.log(err);
                                                                                }
                                                                            });

                                                                        }
                                                                        else {
                                                                            oParam = {
                                                                                "EBELN": me._pono,
                                                                                "EDI": "X",
                                                                                "DOWNLOAD": "N"
                                                                            }
                                                                            resolve(me.onSaveChanges(oParam));
                                                                            resolve();
                                                                        }
                                                                    }
                                                                });
                                                            }
                                                            else if ((me.getView().getModel("topHeaderData").getData().EDIVENDOR !== "L" ? "1" : "0") && (data.results[0].FRGGR === me.getView().getModel("relStratData").getData().RELGRP) && (data.results[0].FRGSX === me.getView().getModel("relStratData").getData().RELSTRAT) && (data.results[0].FRGKE === "1")) {
                                                                oParam = {
                                                                    "EBELN": me._pono,
                                                                    "EDI": "",
                                                                    "DOWNLOAD": "N"
                                                                }

                                                                resolve(me.onSaveChanges(oParam));
                                                                resolve();
                                                            }
                                                        }
                                                    });
                                                });

                                            }
                                        }
                                        // message = oData.N_ChangePOReturn.results[0].Msgv1;
                                        MessageBox.information(message);
                                        resolve()
                                    }else{
                                        MessageBox.error(_captionList.INFO_NO_DTLS_TO_SAVE);
                                    }
                                },error: function(error){
                                    //error message
                                    MessageBox.error(error);
                                    resolve();
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

                        me.byId("vpoBtnUpdatePrice").setVisible(true);
                        me.byId("vpoBtnDelCompleteDetails").setVisible(true);

                        me.enableOtherTabsChild("idIconTabBarInlineMode");
                        me.enableOtherTabsChild("vpoHeaderTxtIconTab");
                        me.byId("vpoDelSchedIconTab").setEnabled(true);
                        me.byId("vpoDelInvIconTab").setEnabled(true);
                        me.byId("vpoPoHistIconTab").setEnabled(true);
                        me.byId("vpoConditionsIconTab").setEnabled(true);
                        me.byId("vpoReceiptsIssuancesIconTab").setEnabled(true);
                        // me.byId("vpoNewHdrTxtRemarks").setEnabled(true);
                        // me.byId("vpoEditHdrTxtRemarks").setEnabled(true);
                        // me.byId("vpoDeleteHdrTxtRemarks").setEnabled(true);

                        // me.byId("vpoHdrMenuBtn").setEnabled(true);
                        // me.byId("vpoBtnEditHeader").setEnabled(true);
                        // me.byId("vpoBtnRefreshtHeader").setEnabled(true);

                        // me.byId("vpoNewHdrTxtPkgInst").setEnabled(true);
                        // me.byId("vpoEditHdrTxtPkgInst").setEnabled(true);
                        // me.byId("vpoDeleteHdrTxtPkgInst").setEnabled(true);
                        me.loadAllData()
                        resolve()
                    });
                    await _promiseResult;
                    // if (this.getView().getModel("ui").getData().dataMode === 'NEW') this.setFilterAfterCreate();

                    this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                    Common.closeLoadingDialog(that);
                }

            },
            onDelCompletePODtls: async function(){
                var me = this;
                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
                    MessageBox.error(_captionList.INFO_PO_NOT_VALID_TO_EDIT)
                    return;
                }

                var oModel = this.getOwnerComponent().getModel();
                var rfcModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var oEntitySet = "/VPODetailsSet";

                var poNo;
                var oTable = this.byId("vpoDetailsTab");
                var aSelIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];

                var aData = this.getView().getModel("VPODtlsVPODet").getData().results;
                var iCounter = 0;
                var bProceed = true;
                var oParamInitParam = {}
                var oParamDataPO = [];
                var oParamDataPOClose = [];
                var oParam = {};

                var topHeaderData = this.getView().getModel("topHeaderData").getData();

                var shipToPlant = topHeaderData.SHIPTOPLANT;//this.byId("f1ShipToPlant").getValue().split('-')[0].trim();
                var incoTerms = topHeaderData.INCOTERMS;//this.byId("f1Incoterms").getValue().split('-')[0].trim();
                var destination = topHeaderData.DEST;//this.byId("f1Destination").getValue();
                var shipMode = topHeaderData.SHIPMODE;//this.byId("f1ShipMode").getValue().split('-')[0].trim();
                var message = "";

                if (aSelIndices.length > 0) {
                    aSelIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    });

                    aSelIndices = oTmpSelectedIndices;

                    for(var item in aSelIndices){
                        poNo = aData.at(item).PONO;
                        oModel.read(oEntitySet, {
                            urlParameters: {
                                "$filter": "PONO eq '" + poNo + "'"
                            },
                            success: async function (data, response) {
                                data.results.forEach(async dataItem => {
                                    if(aData.at(item).ITEM == dataItem.ITEM){
                                        iCounter++;
                                        if (aData.at(item).DELETED === false && (aData.at(item).CLOSED === false)) {
                                            bProceed = true;

                                            oParamInitParam = {
                                                IPoNumber: me._pono,
                                                IDoDownload: "N",
                                                IChangeonlyHdrplants: "N",
                                            }
                                            oParamDataPO.push({
                                                Banfn: aData.at(item).PRNO, //PRNO
                                                Bnfpo: aData.at(item).PRITM, //PRITM
                                                Ebeln: me._pono,//pono
                                                Unsez: shipToPlant, //shipToPlant
                                                Inco1: incoTerms, // Incoterms
                                                Inco2: destination, //Destination
                                                Evers: shipMode, //ShipMode
                                                Ebelp: aData.at(item).ITEM,//poitem
                                                Txz01: aData.at(item).SHORTTEXT,//shorttext
                                                Menge: aData.at(item).POQTY,//QTY
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
                                                Elikz: true, //Closed
                                                // Delete_Rec: aData.at(item).DELETED//Delete
                                                
                                            });
                                            oParamDataPOClose.push({
                                                Banfn: aData.at(item).PRNO, //PRNO
                                                Bnfpo: aData.at(item).PRITM, //PRITM
                                                Ebakz: "" 
                                            });
                                        }else{
                                            bProceed = false;
                                        }
                                        if(bProceed){
                                            if (aSelIndices.length === iCounter) {
                                                if (oParamDataPO.length > 0) {
                                                    oParam = oParamInitParam;
                                                    oParam['N_ChangePOItemParam'] = oParamDataPO;
                                                    oParam['N_ChangePOClosePRParam'] = oParamDataPOClose;
                                                    oParam['N_ChangePOReturn'] = [];
                                                    _promiseResult = new Promise((resolve, reject)=>{
                                                        rfcModel.create("/ChangePOSet", oParam, {
                                                            method: "POST",
                                                            success: function(oData, oResponse){
                                                                message = ""
                                                                if(oData.N_ChangePOReturn.results.length > 0){
                                                                    var oParam = {};
                                                                    for(var errCount = 0; errCount <= oData.N_ChangePOReturn.results.length - 1; errCount++){
                                                                        message =+ oData.N_ChangePOReturn.results[errCount] === undefined ? "": oData.N_ChangePOReturn.results[errCount].Msgv1;
                                                                        if (oData.N_ChangePOReturn.results[errCount].Msgtyp === 'S') {
                                                                        }
                                                                    }
                                                                    MessageBox.information(message);
                                                                    resolve();
                                                                }
                                                            },error: function(error){
                                                                //error message
                                                                MessageBox.error(error);
                                                                resolve();
                                                            }
                                                        });
                                                    });
                                                    
                                                    Common.openLoadingDialog(that);
                                                    await _promiseResult;
                                                    await me.loadAllData();
                                                    Common.closeLoadingDialog(that);
                                                }
                                            }
                                        }else{
                                            MessageBox.error(_captionList.INFO_PO_CLOSED_DELETED);
                                        }
                                    }
                                })
                            },error: function(error){
    
                            }
                        })
                    }
                }else{
                    MessageBox.error(_captionList.INFO_NO_RECORD_SELECT);
                }

            },
            onEditPODelSched: async function(){
                var me = this;
                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
                    MessageBox.error(_captionList.INFO_PO_NOT_VALID_TO_EDIT)
                    return;
                }

                var oModel = this.getOwnerComponent().getModel();
                oModel.setUseBatch(true);
                oModel.setDeferredGroups(["insert"]);
                var modelParameter = {
                    "groupId": "insert"
                };
                var oEntitySet = "/VPODelSchedSet";

                var poNo;
                var oTable = this.byId("vpoDelSchedTab");
                var aSelIndices = oTable.getSelectedIndices();
                var oSelectedIndices = oTable.getBinding("rows").aIndices;
                var oTmpSelectedIndices = [];

                var aData = this.getView().getModel("VPODelSchedVPODet").getData().results;
                var aDataToEdit = [];
                var iCounter = 0;
                var bProceed = true;

                if (aSelIndices.length > 0) {
                    aSelIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    });

                    aSelIndices = oTmpSelectedIndices;

                    aSelIndices.forEach((item, index) => {
                        poNo = aData.at(item).PONO;

                        oModel.read(oEntitySet, {
                            urlParameters: {
                                "$filter": "PONO eq '" + poNo + "'"
                            },
                            success: async function (data, response) {
                                data.results.forEach(async dataItem => {
                                    if(aData.at(item).ITEM === dataItem.ITEM && aData.at(item).SEQNO === dataItem.SEQNO){
                                        iCounter++;
                                        if (aData.at(item).DELETED === false ) {
                                            bProceed = true;
                                            aDataToEdit.push(aData.at(item));
                                        }else{
                                            bProceed = false;
                                        }

                                        if(bProceed){
                                            if (aSelIndices.length === iCounter) {
                                                me.getView().getModel("VPODelSchedVPODet").setProperty("/results", aDataToEdit);
                                                
                                                me.setTableColumnsData("VPODELSCHED");
                                                // me.byId("vpoSearchFieldDetails").setVisible(false);
                                                me.byId("vpoBtnLineSplit").setVisible(false);
                                                me.byId("vpoBtnEditDelSched").setVisible(false);
                                                me.byId("vpoBtnSaveDelSched").setVisible(true);
                                                me.byId("vpoBtnCancelDelSched").setVisible(true);
                                                me.byId("vpoBtnDeleteDelSched").setVisible(false);
                                                me.byId("vpoBtnRefresDelSched").setVisible(false);
                                                me.byId("vpoBtnExportToExcelDelSched").setVisible(false);

                                                me.disableOtherTabsChild("idIconTabBarInlineMode");
                                                me.disableOtherTabsChild("vpoHeaderTxtIconTab");
                                                me.byId("vpoDetailsIconTab").setEnabled(false);
                                                me.byId("vpoDelInvIconTab").setEnabled(false);
                                                me.byId("vpoPoHistIconTab").setEnabled(false);
                                                me.byId("vpoConditionsIconTab").setEnabled(false);
                                                me.byId("vpoReceiptsIssuancesIconTab").setEnabled(false);

                                                me.onRowEditPO("vpoDelSchedTab", "VPODELSCHEDColumnsVPODet");
                                                
                                                me.getView().getModel("ui").setProperty("/dataMode", 'EDIT');
                                                
                                            }
                                        }else{
                                            MessageBox.error(_captionList.INFO_PO_CLOSED_DELETED);
                                        }
                                    }
                                });
                            },error: function(error){
    
                            }
                        });
                    });
                }else{
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })
                    
                    oSelectedIndices = oTmpSelectedIndices;
                    oSelectedIndices.forEach((item, index) => {
                        poNo = aData.at(item).PONO;

                        oModel.read(oEntitySet, {
                            urlParameters: {
                                "$filter": "PONO eq '" + poNo + "'"
                            },
                            success: async function (data, response) {
                                data.results.forEach(async dataItem => {
                                    if(aData.at(item).ITEM === dataItem.ITEM && aData.at(item).SEQNO === dataItem.SEQNO){
                                        iCounter++;
                                        if (aData.at(item).DELETED === false ) {
                                            bProceed = true;
                                            aDataToEdit.push(aData.at(item));
                                        }else{
                                            bProceed = false;
                                        }

                                        if(bProceed){
                                            if (oSelectedIndices.length === iCounter) {
                                                me.getView().getModel("VPODelSchedVPODet").setProperty("/results", aDataToEdit);
                                                me.setTableColumnsData("VPODELSCHED");
                                                // me.byId("vpoSearchFieldDetails").setVisible(false);
                                                me.byId("vpoBtnLineSplit").setVisible(false);
                                                me.byId("vpoBtnEditDelSched").setVisible(false);
                                                me.byId("vpoBtnSaveDelSched").setVisible(true);
                                                me.byId("vpoBtnCancelDelSched").setVisible(true);
                                                me.byId("vpoBtnDeleteDelSched").setVisible(false);
                                                me.byId("vpoBtnRefresDelSched").setVisible(false);
                                                me.byId("vpoBtnExportToExcelDelSched").setVisible(false);

                                                me.disableOtherTabsChild("idIconTabBarInlineMode");
                                                me.disableOtherTabsChild("vpoHeaderTxtIconTab");
                                                me.byId("vpoDetailsIconTab").setEnabled(false);
                                                me.byId("vpoDelInvIconTab").setEnabled(false);
                                                me.byId("vpoPoHistIconTab").setEnabled(false);
                                                me.byId("vpoConditionsIconTab").setEnabled(false);
                                                me.byId("vpoReceiptsIssuancesIconTab").setEnabled(false);

                                                me.onRowEditPO("vpoDelSchedTab", "VPODELSCHEDColumnsVPODet");
                                                
                                                me.getView().getModel("ui").setProperty("/dataMode", 'EDIT');
                                                
                                            }
                                        }else{
                                            MessageBox.error(_captionList.INFO_PO_CLOSED_DELETED);
                                        }
                                    }
                                });
                            },error: function(error){
    
                            }
                        });
                    });
                }
            },
            
            onLineSplitPODelSched: async function(){
                var me = this;

                // _promiseResult = new Promise((resolve, reject)=>{
                //     resolve(me.validatePOChange());
                // })
                // await _promiseResult;

                // if(this._validPOChange != 1){
                //     MessageBox.error(_captionList.INFO_PO_NOT_VALID_TO_EDIT)
                //     return;
                // }

                var oModel = this.getOwnerComponent().getModel();
                var oTable = this.byId("vpoDelSchedTab");
                var aSelIndices = oTable.getSelectedIndices();
                var aData = oTable.getModel().getData().rows;
                var oParamInitParam = {}
                var oParamDataPOSched = [];
                var oParam = {};
                var oTmpSelectedIndices = [];
                var rfcModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");

                var message = "";
                var poNo = this._pono;

                var seqNoList = [];
                var seqNoCount = 0;
                var delSchedSet = [];

                await new Promise((resolve, reject)=>{
                    oModel.read('/VPODelSchedSet', { 
                        urlParameters: {
                            "$filter": "PONO eq '" + poNo + "'"
                        },
                        success: function (data, response) {
                            if (data.results.length > 0) {
                                delSchedSet = data.results;
                                delSchedSet.sort((a,b) => (a.ITEM > b.ITEM) ? 1 : ((b.ITEM > a.ITEM) ? -1 : 0));
                            }
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
                if (aSelIndices.length > 0) {
                    aSelIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    });
            
                    aSelIndices = oTmpSelectedIndices;
                    aSelIndices.forEach(async(item, index) => {
                        for(var x = 0; x < delSchedSet.length; x++){
                            if(delSchedSet[x].ITEM === aData.at(item).ITEM && delSchedSet[x].SEQNO === aData.at(item).SEQNO){
                                var wItemSeqNo = {};
                                if(seqNoList[0] === undefined){
                                    wItemSeqNo = {
                                        ITEM: aData.at(item).ITEM,
                                        SEQNO: [delSchedSet[x].SEQNO]
                                    }
                                    seqNoList.push(wItemSeqNo);
                                    seqNoList[0].SEQNO.sort(function(a, b){return b - a});
                                }else{
                                    for(var y = 0; y < seqNoList.length; y++){
                                        if(seqNoList[y].ITEM === delSchedSet[x].ITEM){

                                            if (!seqNoList[y].SEQNO.includes(delSchedSet[x].SEQNO)) {
                                                // ✅ only runs if value not in array
                                                seqNoList[y].SEQNO.push(delSchedSet[x].SEQNO);
                                            }
                                        }else{
                                            wItemSeqNo = {
                                                ITEM: aData.at(item).ITEM,
                                                SEQNO: [delSchedSet[x].SEQNO]
                                            }
                                            seqNoList.push(wItemSeqNo);
                                        }
                                        seqNoList[y].SEQNO.sort(function(a, b){return b - a});
                                    }
                                }
                            }
                        }
                    })

                    aSelIndices.forEach(async(item, index) => {
                        for(var x = 0; x < seqNoList.length; x++){
                            if(aData.at(item).ITEM === seqNoList[x].ITEM){

                                seqNoCount = isNaN(seqNoList[x].SEQNO[0]) ? 0 : seqNoList[x].SEQNO[0];
                                seqNoCount = String(parseInt(seqNoCount) + 1);

                                while (seqNoCount.length < 4) seqNoCount = "0" + seqNoCount;

                                if (!seqNoList[x].SEQNO.includes(seqNoCount)) {
                                    // ✅ only runs if value not in array
                                    seqNoList[x].SEQNO.push(seqNoCount);
                                }
                                seqNoList[x].SEQNO.sort(function(a, b){return b - a});

                                oParamInitParam = {
                                    IPoNumber: me._pono,
                                    IDoDownload: "N",
                                    IChangeonlyHdrplants: "N",
                                }
                                oParamDataPOSched.push({
                                    PoNumber: me._pono,
                                    PoItem: aData.at(item).ITEM,
                                    SchedLine: seqNoCount,
                                    Quantity: aData.at(item).SCHEDQTY,
                                    DelivDate: sapDateFormat.format(new Date(aData.at(item).DELDT)) + "T00:00:00",
                                    PreqNo: aData.at(item).PRNO,
                                    PreqItem: aData.at(item).PRITM,
                                    
                                });

                            }
                        }
                    });
                    if (oParamDataPOSched.length > 0) {
                        oParam = oParamInitParam;
                        oParam['N_ChangePOItemSchedParam'] = oParamDataPOSched;
                        oParam['N_ChangePOReturn'] = [];
                    }
                    Common.openLoadingDialog(that);
                    await new Promise((resolve, reject)=>{
                        rfcModel.create("/ChangePOSet", oParam, {
                            method: "POST",
                            success: async function(oData, oResponse){
                                if(oData.N_ChangePOReturn.results[0].Msgtyp === 'E'){
                                    message = oData.N_ChangePOReturn.results[0].Msgv1;
                                    MessageBox.error(message);
                                    resolve()
                                }else{
                                    message = oData.N_ChangePOReturn.results[0].Msgv1;
                                    MessageBox.information(message);
                                    await new Promise((resolve, reject)=>{
                                        resolve(me.loadAllData())
                                    });
                                    resolve()
                                }   
                            },error: function(error){
                                MessageBox.error(error);
                                reject();
                            }
                        })
                    });
                    Common.closeLoadingDialog(that);
            
                }
            },

            onCancelEditPODelSched: async function(){
                var me = this;
                if (!this._DiscardChangesDialog) {
                    this._DiscardChangesDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.DiscardChangesDialog", this);
                    this.getView().addDependent(this._DiscardChangesDialog);
                }
                this._DiscardChangesDialog.open();
            },
            onSaveEditPODelSched: async function(){
                var me = this;
                var oTable = this.byId("vpoDelSchedTab");
                var oSelectedIndices = oTable.getBinding("rows").aIndices;
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;
                var oParamInitParam = {}
                var oParamDataPO = [];
                var oParamDataPOClose = [];
                var oParam = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                
                var bProceed = true;

                if (this._validationErrors.length != 0){
                    MessageBox.error(_captionList.INFO_REQUIRED_FIELD);
                    bProceed = false;
                }

                var message = "";
                if(bProceed){
                    Common.openLoadingDialog(that);
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    });

                    oSelectedIndices = oTmpSelectedIndices;

                    oSelectedIndices.forEach((item, index) => {
                        oParamInitParam = {
                            IPoNumber: me._pono,
                            IDoDownload: "N",
                            IChangeonlyHdrplants: "N",
                        }
                        oParamDataPO.push({
                            PoNumber:    aData.at(item).PONO,
                            PoItem:      aData.at(item).ITEM,
                            SchedLine:   aData.at(item).SEQNO,
                            DelivDate:   aData.at(item).DELDT === "" ? null : sapDateFormat.format(new Date(aData.at(item).DELDT)) + "T00:00:00",
                            Quantity:    aData.at(item).SCHEDQTY,
                            PreqNo:      aData.at(item).PRNO,
                            PreqItem:    aData.at(item).PRITM,
                            Batch:       aData.at(item).SEQNO,
                            VendBatch:   aData.at(item).SEQNO,
                            AsnNo:       aData.at(item).ASNNO,
                            AsnQty:      aData.at(item).ASNQTY,
                            Etd:         aData.at(item).ETD === "" ? null : sapDateFormat.format(new Date(aData.at(item).ETD)) + "T00:00:00",
                            EtaPort:     aData.at(item).ETDPORT === "" ? null : sapDateFormat.format(new Date(aData.at(item).ETDPORT)) + "T00:00:00",
                            EtaFty:      aData.at(item).ETAFTY === "" ? null : sapDateFormat.format(new Date(aData.at(item).ETAFTY)) + "T00:00:00",
                            Shipmode:    aData.at(item).SHIPMODE,
                            Remarks:     aData.at(item).REMARKS,
                            // Delete_Ind:  aData.at(item).DELETED
                        });
                        oParamDataPOClose.push({
                            Banfn: aData.at(item).PRNO, //PRNO
                            Bnfpo: aData.at(item).PRITM, //PRITM
                            Ebakz: "" 
                        });
                    });
                    if (oParamDataPO.length > 0) {
                        oParam = oParamInitParam;
                        oParam['N_ChangePOItemSchedParam'] = oParamDataPO;
                        oParam['N_ChangePOClosePRParam'] = oParamDataPOClose;
                        oParam['N_ChangePOReturn'] = [];
                        _promiseResult = new Promise((resolve, reject)=>{
                            oModel.create("/ChangePOSet", oParam, {
                                method: "POST",
                                success: async function(oData, oResponse){
                                    if(oData.N_ChangePOReturn.results[0].Msgtyp === 'E'){
                                        message = oData.N_ChangePOReturn.results[0].Msgv1;
                                        MessageBox.error(message);
                                        resolve()
                                    }else{
                                        message = oData.N_ChangePOReturn.results[0].Msgv1;
                                        MessageBox.information(message);
                                        await new Promise((resolve, reject)=>{
                                            resolve(me.loadAllData())
                                        });
                                        resolve()
                                    }   
                                },error: function(error){
                                    MessageBox.error(error);
                                    reject();
                                }
                            })
                        });
                        await _promiseResult;
                    }

                    _promiseResult = new Promise((resolve, reject)=>{
                        // me.byId("vpoSearchFieldDetails").setVisible(true)
                        me.byId("vpoBtnLineSplit").setVisible(true);
                        me.byId("vpoBtnEditDelSched").setVisible(true);
                        me.byId("vpoBtnSaveDelSched").setVisible(false);
                        me.byId("vpoBtnCancelDelSched").setVisible(false);
                        me.byId("vpoBtnDeleteDelSched").setVisible(true);
                        me.byId("vpoBtnRefresDelSched").setVisible(true);
                        me.byId("vpoBtnExportToExcelDelSched").setVisible(true);

                        me.byId("vpoBtnUpdatePrice").setVisible(true);
                        me.byId("vpoBtnDelCompleteDetails").setVisible(true);

                        me.enableOtherTabsChild("idIconTabBarInlineMode");
                        me.enableOtherTabsChild("vpoHeaderTxtIconTab");
                        me.byId("vpoDetailsIconTab").setEnabled(true);
                        me.byId("vpoDelInvIconTab").setEnabled(true);
                        me.byId("vpoPoHistIconTab").setEnabled(true);
                        me.byId("vpoConditionsIconTab").setEnabled(true);
                        me.byId("vpoReceiptsIssuancesIconTab").setEnabled(true);
                        me.loadAllData()
                        resolve()
                    });
                    await _promiseResult;
                    this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                    Common.closeLoadingDialog(that);
                }
            },
            onDeletePODelSched: async function(){
                var me = this;
                var bProceed = true;

                var oTable = this.byId("vpoDelSchedTab");
                var oSelectedIndices = oTable.getSelectedIndices();;
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;
                var oParamInitParam = {}
                var oParamDataPO = [];
                var oParamDataPOClose = [];
                var oParam = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var message = "";
                var actionSel;
                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if (this._validationErrors.length != 0){
                    MessageBox.error(_captionList.INFO_REQUIRED_FIELD);
                    bProceed = false;
                }

                if(this._validPOChange != 1){
                    MessageBox.error(_captionList.INFO_PO_NOT_VALID_TO_EDIT)
                    bProceed = false;
                    return;
                }
                this.getView().getModel("VPODtlsVPODet").getProperty("/results").forEach(item => {
                    if(item.DELETED || item.CLOSED){
                        MessageBox.error(_captionList.INFO_PO_CLOSED_DELETED)
                        bProceed = false;
                        return;
                    }
                });

                if(bProceed){
                    var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
                    _promiseResult = new Promise((resolve, reject) => {
                        MessageBox.information(
                            _captionList.CONF_PROCEED_DELETE_RECORD,
                            {
                                actions: [_captionList.DELETE, MessageBox.Action.CLOSE],
                                styleClass: bCompact ? "sapUiSizeCompact" : "",
                                onClose: async function(sAction) {
                                    actionSel = sAction;
                                    resolve(actionSel);
                                }
                            }
                        );
                    })
                    await _promiseResult;

                    if(actionSel === "Delete"){
                        Common.openLoadingDialog(that);
                        oSelectedIndices.forEach(item => {
                            oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                        });

                        oSelectedIndices = oTmpSelectedIndices;

                        oSelectedIndices.forEach((item, index) => {
                            oParamInitParam = {
                                IPoNumber: me._pono,
                                IDoDownload: "N",
                                IChangeonlyHdrplants: "N",
                            }
                            oParamDataPO.push({
                                PoNumber:    aData.at(item).PONO,
                                PoItem:      aData.at(item).ITEM,
                                SchedLine:   aData.at(item).SEQNO,
                                DelivDate:   aData.at(item).DELDT === "" ? null : sapDateFormat.format(new Date(aData.at(item).DELDT)) + "T00:00:00",
                                Quantity:    aData.at(item).SCHEDQTY,
                                PreqNo:      aData.at(item).PRNO,
                                PreqItem:    aData.at(item).PRITM,
                                Batch:       aData.at(item).SEQNO,
                                VendBatch:   aData.at(item).SEQNO,
                                AsnNo:       aData.at(item).ASNNO,
                                AsnQty:      aData.at(item).ASNQTY,
                                Etd:         aData.at(item).ETD === "" ? null : sapDateFormat.format(new Date(aData.at(item).ETD)) + "T00:00:00",
                                EtaPort:     aData.at(item).ETDPORT === "" ? null : sapDateFormat.format(new Date(aData.at(item).ETDPORT)) + "T00:00:00",
                                EtaFty:      aData.at(item).ETAFTY === "" ? null : sapDateFormat.format(new Date(aData.at(item).ETAFTY)) + "T00:00:00",
                                Shipmode:    aData.at(item).SHIPMODE,
                                Remarks:     aData.at(item).REMARKS,
                                DeleteInd:   "X"
                            });
                            oParamDataPOClose.push({
                                Banfn: aData.at(item).PRNO, //PRNO
                                Bnfpo: aData.at(item).PRITM, //PRITM
                                Ebakz: "" 
                            });
                        });
                        if (oParamDataPO.length > 0) {
                            oParam = oParamInitParam;
                            oParam['N_ChangePOItemSchedParam'] = oParamDataPO;
                            oParam['N_ChangePOClosePRParam'] = oParamDataPOClose;
                            oParam['N_ChangePOReturn'] = [];
                            _promiseResult = new Promise((resolve, reject)=>{
                                oModel.create("/ChangePOSet", oParam, {
                                    method: "POST",
                                    success: async function(oData, oResponse){
                                        if(oData.N_ChangePOReturn.results[0].Msgtyp === 'E'){
                                            message = oData.N_ChangePOReturn.results[0].Msgv1;
                                            MessageBox.error(message);
                                            resolve()
                                        }else{
                                            message = oData.N_ChangePOReturn.results[0].Msgv1;
                                            MessageBox.information(message);
                                            await new Promise((resolve, reject)=>{
                                                resolve(me.loadAllData())
                                            });
                                            resolve()
                                        }   
                                    },error: function(error){
                                        MessageBox.error(error);
                                        reject();
                                    }
                                })
                            });
                            await _promiseResult;
                        }

                        _promiseResult = new Promise((resolve, reject)=>{
                            // me.byId("vpoSearchFieldDetails").setVisible(true)
                            me.byId("vpoBtnLineSplit").setVisible(true);
                            me.byId("vpoBtnEditDelSched").setVisible(true);
                            me.byId("vpoBtnSaveDelSched").setVisible(false);
                            me.byId("vpoBtnCancelDelSched").setVisible(false);
                            me.byId("vpoBtnDeleteDelSched").setVisible(true);
                            me.byId("vpoBtnRefresDelSched").setVisible(true);
                            me.byId("vpoBtnExportToExcelDelSched").setVisible(true);

                            me.enableOtherTabsChild("idIconTabBarInlineMode");
                            me.enableOtherTabsChild("vpoHeaderTxtIconTab");
                            me.byId("vpoDetailsIconTab").setEnabled(true);
                            me.byId("vpoDelInvIconTab").setEnabled(true);
                            me.byId("vpoPoHistIconTab").setEnabled(true);
                            me.byId("vpoConditionsIconTab").setEnabled(true);
                            me.byId("vpoReceiptsIssuancesIconTab").setEnabled(true);
                            me.loadAllData()
                            resolve()
                        });
                        await _promiseResult;
                        
                        Common.closeLoadingDialog(that);
                    }else if(actionSel === "Cancel"){
                        MessageBox.Action.CLOSE
                    }
                }
            },

            onEditDelInv: async function(){
                var me = this;
                
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.validatePOChange());
                })
                await _promiseResult;

                if(this._validPOChange != 1){
                    MessageBox.error(_captionList.INFO_PO_NOT_VALID_TO_EDIT)
                    return;
                }

                var oModel = this.getOwnerComponent().getModel();
                oModel.setUseBatch(true);
                oModel.setDeferredGroups(["insert"]);
                var modelParameter = {
                    "groupId": "insert"
                };
                var oEntitySet = "/VPODelInvSet";

                var poNo;
                var oTable = this.byId("vpoDelInvTab");
                var aSelIndices = oTable.getSelectedIndices();
                var oSelectedIndices = oTable.getBinding("rows").aIndices;
                var oTmpSelectedIndices = [];

                var aData = this._oDataBeforeChange.results != undefined? this._oDataBeforeChange.results : this.getView().getModel("VPODelInvVPODet").getData().results;
                var aDataToEdit = [];
                var iCounter = 0;
                var bProceed = true;
                var oParamPODATA = [];

                if (aSelIndices.length > 0) {
                    aSelIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    });

                    aSelIndices = oTmpSelectedIndices;

                    aSelIndices.forEach((item, index) => {
                        poNo = aData.at(item).PONO;

                        oModel.read(oEntitySet, {
                            urlParameters: {
                                "$filter": "PONO eq '" + poNo + "'"
                            },
                            success: async function (data, response) {
                                data.results.forEach(async dataItem => {
                                    if(aData.at(item).ITEM == dataItem.ITEM){
                                        iCounter++;
                                        if (aData.at(item).DELETED === false || aData.at(item).DLVCOMPLETED === false) {
                                            bProceed = true;
                                            aDataToEdit.push(aData.at(item));
                                        }else{
                                            bProceed = false;
                                        }

                                        if(bProceed){
                                            if (aSelIndices.length === iCounter) {
                                                me._oDataBeforeChange = me.getView().getModel("VPODelInvVPODet").getProperty("/results");
                                                me.getView().getModel("VPODelInvVPODet").setProperty("/results", aDataToEdit);
                                                me.setTableColumnsData("VPODELINV");
                                                // me.byId("vpoSearchFieldDetails").setVisible(false);
                                                me.byId("vpoBtnRefresDelInv").setVisible(false);
                                                me.byId("vpoBtnEditDelInv").setVisible(false);
                                                me.byId("vpoBtnSaveDelInv").setVisible(true);
                                                me.byId("vpoBtnCancelDelInv").setVisible(true);
                                                me.byId("vpoBtnExportToExcelDelInv").setVisible(false);

                                                me.disableOtherTabsChild("idIconTabBarInlineMode");
                                                me.disableOtherTabsChild("vpoHeaderTxtIconTab");
                                                me.byId("vpoDetailsIconTab").setEnabled(false);
                                                me.byId("vpoDelSchedIconTab").setEnabled(false);
                                                me.byId("vpoPoHistIconTab").setEnabled(false);
                                                me.byId("vpoConditionsIconTab").setEnabled(false);
                                                me.byId("vpoReceiptsIssuancesIconTab").setEnabled(false);

                                                me.onRowEditPO("vpoDelInvTab", "VPODELINVColumnsVPODet");
                                                
                                                me.getView().getModel("ui").setProperty("/dataMode", 'EDIT');
                                                
                                            }
                                        }else{
                                            MessageBox.error(_captionList.INFO_PO_CLOSED_DELETED);
                                        }
                                    }
                                });
                            },error: function(error){
    
                            }
                        });
                    });
                }else{
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })
                    
                    oSelectedIndices = oTmpSelectedIndices;
                    oSelectedIndices.forEach((item, index) => {
                        poNo = aData.at(item).PONO;

                        oModel.read(oEntitySet, {
                            urlParameters: {
                                "$filter": "PONO eq '" + poNo + "'"
                            },
                            success: async function (data, response) {
                                data.results.forEach(async dataItem => {
                                    if(aData.at(item).ITEM == dataItem.ITEM){
                                        iCounter++;
                                        if (aData.at(item).DELETED === false || aData.at(item).DLVCOMPLETED === false) {
                                            bProceed = true;
                                            aDataToEdit.push(aData.at(item));
                                        }else{
                                            bProceed = false;
                                        }

                                        if(bProceed){
                                            if (oSelectedIndices.length === iCounter) {
                                                me._oDataBeforeChange = me.getView().getModel("VPODelInvVPODet").getProperty("/results");
                                                me.getView().getModel("VPODelInvVPODet").setProperty("/results", aDataToEdit);
                                                me.setTableColumnsData("VPODELINV");
                                                // me.byId("vpoSearchFieldDetails").setVisible(false);
                                                me.byId("vpoBtnRefresDelInv").setVisible(false);
                                                me.byId("vpoBtnEditDelInv").setVisible(false);
                                                me.byId("vpoBtnSaveDelInv").setVisible(true);
                                                me.byId("vpoBtnCancelDelInv").setVisible(true);
                                                me.byId("vpoBtnExportToExcelDelInv").setVisible(false);

                                                me.disableOtherTabsChild("idIconTabBarInlineMode");
                                                me.disableOtherTabsChild("vpoHeaderTxtIconTab");
                                                me.byId("vpoDetailsIconTab").setEnabled(false);
                                                me.byId("vpoDelSchedIconTab").setEnabled(false);
                                                me.byId("vpoPoHistIconTab").setEnabled(false);
                                                me.byId("vpoConditionsIconTab").setEnabled(false);
                                                me.byId("vpoReceiptsIssuancesIconTab").setEnabled(false);

                                                me.onRowEditPO("vpoDelInvTab", "VPODELINVColumnsVPODet");
                                                
                                                me.getView().getModel("ui").setProperty("/dataMode", 'EDIT');
                                                
                                            }
                                        }else{
                                            MessageBox.error(_captionList.INFO_PO_CLOSED_DELETED);
                                        }
                                    }
                                });
                            },error: function(error){
    
                            }
                        });
                    });
                }
            },
            onSaveEditDelInv: async function(){
                var me = this;
                var poNo;
                var oTable = this.byId("vpoDelInvTab");
                var oEntitySet = "/VPODetailsSet";
                var iCounter = 0;

                var oSelectedIndices = oTable.getBinding("rows").aIndices;
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;
                var oParamInitParam = {}
                var oParamDataPO = [];
                var oParamDataPOClose = [];
                var oParam = {};
                var rfcModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var oModel = this.getOwnerComponent().getModel();
                var bProceed = true;

                var topHeaderData = this.getView().getModel("topHeaderData").getData();

                var shipToPlant = topHeaderData.SHIPTOPLANT;//this.byId("f1ShipToPlant").getValue().split('-')[0].trim();
                var incoTerms = topHeaderData.INCOTERMS;//this.byId("f1Incoterms").getValue().split('-')[0].trim();
                var destination = topHeaderData.DEST;//this.byId("f1Destination").getValue();
                var shipMode = topHeaderData.SHIPMODE;//this.byId("f1ShipMode").getValue().split('-')[0].trim();

                if (this._validationErrors.length != 0){
                    MessageBox.error(_captionList.INFO_REQUIRED_FIELD);
                    bProceed = false;
                }

                var message;

                if(bProceed){
                    Common.openLoadingDialog(that);
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })
                    
                    oSelectedIndices = oTmpSelectedIndices;
                    await new Promise((resolve, reject)=>{
                        
                        oSelectedIndices.forEach(async (item, index) => {
                            poNo = aData.at(item).PONO;

                            await new Promise((resolve, reject)=>{
                                oModel.read(oEntitySet, {
                                    urlParameters: {
                                        "$filter": "PONO eq '" + poNo + "'"
                                    },
                                    success: async function (data, response) {
                                        data.results.forEach(async dataItem => {
                                            if(aData.at(item).ITEM == dataItem.ITEM){
                                                iCounter++;

                                                oParamInitParam = {
                                                    IPoNumber: me._pono,
                                                    IDoDownload: "N",
                                                    IChangeonlyHdrplants: "N",
                                                }
                                                oParamDataPO.push({
                                                    Banfn: dataItem.PRNO, //PRNO
                                                    Bnfpo: dataItem.PRITM, //PRITM
                                                    Ebeln: me._pono,//pono
                                                    Unsez: shipToPlant, //shipToPlant
                                                    Inco1: incoTerms, // Incoterms
                                                    Inco2: destination, //Destination
                                                    Evers: shipMode, //ShipMode
                                                    Ebelp: dataItem.ITEM,//poitem
                                                    Txz01: dataItem.SHORTTEXT,//shorttext
                                                    Menge: dataItem.POQTY,//QTY
                                                    Meins: dataItem.UOM,//UOM
                                                    Netpr: dataItem.NETPRICE,//net price
                                                    Peinh: dataItem.PER,//PER
                                                    Bprme: dataItem.ORDERPRICEUOM, //Order Price Unit
                                                    Repos: dataItem.INVRCPTIND, //IR Indicator
                                                    Webre: dataItem.GRBASEDIVIND, //GR Based Ind
                                                    Eindt: sapDateFormat.format(new Date(dataItem.DELDT)) + "T00:00:00", //DlvDt
                                                    Uebtk: aData.at(item).UNLIMITED,//Unlimited
                                                    Uebto: aData.at(item).OVERDELTOL,//OverDel Tol.
                                                    Untto: aData.at(item).UNDERDELTOL,//UnderDel Tol.
                                                    Zzmakt: dataItem.POADDTLDESC, //PO Addtl Desc
                                                    Elikz: dataItem.CLOSED, //Closed
                                                    // Delete_Rec: aData.at(item).DELETED//Delete
                                                    
                                                });
                                                oParamDataPOClose.push({
                                                    Banfn: dataItem.PRNO, //PRNO
                                                    Bnfpo: dataItem.PRITM, //PRITM
                                                    Ebakz: "" 
                                                });

                                                if(oSelectedIndices.length === iCounter){
                                                    resolve();
                                                }
                                            }
                                        });
                                    },error: function(error){
                                        reject();
                                    }
                                })
                            })

                            if (oParamDataPO.length > 0) {
                                oParam = oParamInitParam;
                                oParam['N_ChangePOItemParam'] = oParamDataPO;
                                oParam['N_ChangePOClosePRParam'] = oParamDataPOClose;
                                oParam['N_ChangePOReturn'] = [];
                                _promiseResult = new Promise((resolve, reject)=>{
                                    rfcModel.create("/ChangePOSet", oParam, {
                                        method: "POST",
                                        success: async function(oData, oResponse){
                                            if(oData.N_ChangePOReturn.results[0].Msgtyp === 'E'){
                                                message = oData.N_ChangePOReturn.results[0].Msgv1;
                                                MessageBox.error(message);
                                                resolve()
                                            }else{
                                                message = oData.N_ChangePOReturn.results[0].Msgv1;
                                                MessageBox.information(message);
                                                await new Promise((resolve, reject)=>{
                                                    resolve(me.loadAllData())
                                                });
                                                resolve()
                                            }
                                        },error: function(error){
                                            MessageBox.error(error);
                                            reject();
                                        }
                                    })
                                });
                                await _promiseResult;
                            }
                            resolve();

                        });
                    })
                    _promiseResult = new Promise((resolve, reject)=>{
                        me.byId("vpoBtnRefresDelInv").setVisible(true);
                        me.byId("vpoBtnEditDelInv").setVisible(true);
                        me.byId("vpoBtnSaveDelInv").setVisible(false);
                        me.byId("vpoBtnCancelDelInv").setVisible(false);
                        me.byId("vpoBtnExportToExcelDelInv").setVisible(true);
    
                        me.enableOtherTabsChild("idIconTabBarInlineMode");
                        me.enableOtherTabsChild("vpoHeaderTxtIconTab");
                        me.byId("vpoDetailsIconTab").setEnabled(true);
                        me.byId("vpoDelSchedIconTab").setEnabled(true);
                        me.byId("vpoPoHistIconTab").setEnabled(true);
                        me.byId("vpoConditionsIconTab").setEnabled(true);
                        me.byId("vpoReceiptsIssuancesIconTab").setEnabled(true);
                        me.loadAllData()
                        resolve()
                    });
                    await _promiseResult;
                    this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                    Common.closeLoadingDialog(that);
                }
            },
            onCancelEditDelInv: async function(){
                var me = this;
                if (!this._DiscardChangesDialog) {
                    this._DiscardChangesDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.DiscardChangesDialog", this);
                    this.getView().addDependent(this._DiscardChangesDialog);
                }
                this._DiscardChangesDialog.open();
            },

            onSaveChanges: async function (oParam) {
                    var _oMovementTypeData = [];
                    var oModel = this.getOwnerComponent().getModel();
                    var _this = this;
                    oModel.create("/VPODownloadedSet", oParam, {
                    method: "POST",
                    success: function (oResult, oResponse) {
                    }
                });
            },

            getPOTOlerance: async function(dataRow, selectedRow){
                var poNo = this._pono;
                var vSBU = this._sbu;
                var oModel = this.getOwnerComponent().getModel();
                oModel.setUseBatch(true);
                oModel.setDeferredGroups(["insert"]);
                var rfcModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var poDetailsData = this.getView().getModel("VPODtlsVPODet").getProperty("/results");
                rfcModel.setUseBatch(true);
                rfcModel.setDeferredGroups(["insert"]);
                var modelParameter = {
                    "groupId": "insert"
                };
                
                //PO Tolerance
                var oParamGETPOTOL = {};
                var oParamPODATA = {};
                var oParamInfoRec = []
                var docType;
                var vendorCd;
                var purchOrg;
                var purchGrp;

                var resultGETPOTOL = [];

                _promiseResult = new Promise((resolve, reject)=>{
                    oModel.read("/mainSet(PONO='" + poNo + "')", {
                        success: function (oData, oResponse) {
                            // if (oData.PODT !== null)
                            //     oData.PODT = dateFormat.format(new Date(oData.PODT));
                            vendorCd= oData.VENDOR; 
                            docType= oData.DOCTYPE;
                            purchOrg = oData.PURCHORG;
                            purchGrp = oData.PURCHGRP;
                            resolve();
                        },
                        error: function () {
                            resolve();
                        }
                    });
                });

                selectedRow.forEach((item, index) => {
                    //PO Tolerance
                    oParamGETPOTOL = {
                        IV_DOCTYPE: docType,
                        IV_VENDOR: vendorCd,
                        IV_PRNUMBER: dataRow.at(item).PRNO,
                        IV_PRITEM: dataRow.at(item).PRITM, 
                        IV_POQTY: dataRow.at(item).POQTY
                    };

                    //CREATE ENTRIES USING BATCH PROCESSING
                    rfcModel.create("/Get_POTolSet", oParamGETPOTOL, modelParameter);
                })


                //Get PO Tolerance
                _promiseResult = new Promise((resolve, reject)=>{
                    rfcModel.submitChanges({
                        groupId: "insert",
                        success: function(oData, oResponse){
                            oData.__batchResponses[0].__changeResponses.forEach(item=>{
                                resultGETPOTOL.push(item.data)
                            })
                            resolve();
                        },error: function(error){
                            //error message
                            MessageBox.error(error);
                            resolve();
                        }
                    })
                });
                await _promiseResult;
                
                resultGETPOTOL.forEach(async (poTolItem, poTolIndex) => {
                    selectedRow.forEach(async (selRowItem, selRowIndex) => {
                        if(dataRow.at(poTolIndex).PRNO === dataRow.at(selRowItem).PRNO && dataRow.at(poTolIndex).PRITM === dataRow.at(selRowItem).PRITM){
                            // console.log(resultGETPOTOL[selRowItem].RETURN);
                            if(resultGETPOTOL[poTolIndex].RETURN !== 4){//Not Tested
                                oParamPODATA = {};
                                oParamPODATA  = {
                                    EBELN:          "",
                                    EBELP:          "",
                                    WEMNG:          "0",
                                    FOCQTY:         "0",
                                    TOLALLOWEDIT:   resultGETPOTOL.at(selRowItem).EV_ALLOWEDIT,
                                    QTYMIN:         resultGETPOTOL.at(selRowItem).EV_QTYMIN,
                                    QTYMAX:         resultGETPOTOL.at(selRowItem).EV_QTYMAX,
                                    UNTTOMIN:       resultGETPOTOL.at(selRowItem).EV_UNTTOMIN,
                                    UNTTOMAX:       resultGETPOTOL.at(selRowItem).EV_UNTTOMAX,
                                    UEBTOMIN:       resultGETPOTOL.at(selRowItem).EV_UEBTOMIN,
                                    UEBTOMAX:       resultGETPOTOL.at(selRowItem).EV_UEBTOMAX,
                                }
                                //exec ZERP_PODATA
                                var resultPODataSet = [];
                                oModel.create("/PODATASet", oParamPODATA, modelParameter);
                                _promiseResult = new Promise((resolve, reject)=>{
                                    oModel.submitChanges({
                                        groupId: "insert",
                                        success: function(oData, oResponse){
                                            //Success
                                            resolve();
                                        },error: function(error){
                                            //error message
                                            MessageBox.error(error);
                                            resolve();
                                        }
                                    })
                                });
                                await _promiseResult;
                                //Populate below
                                //Update PO Details Field
                                //UEBTO
                                //UNTTO
                                //UEBTK
                                for (var i = 0; i < poDetailsData.length; i++) {
                                    if (poDetailsData[i].PRNO === dataRow.at(selRowItem).PRNO && poDetailsData[i].PRITM === dataRow.at(selRowItem).PRITM) {
                                        poDetailsData[i].UNLIMITED = resultGETPOTOL.at(selRowItem).EV_UNLI
                                        poDetailsData[i].OVERDELTOL = resultGETPOTOL.at(selRowItem).EV_UEBTO
                                        poDetailsData[i].UNDERDELTOL = resultGETPOTOL.at(selRowItem).EV_UNTTO
                                    }
                                }
                            }else{
                                var forGetGMCPOTol = false
                                _promiseResult = new Promise((resolve, reject)=>{
                                    oModel.read("/ZERP_CHECKSet", {
                                        urlParameters: {
                                            "$filter": "SBU eq '" + vSBU + "'"
                                        },
                                        success: function (oData, oResponse) {
                                            oData.results.forEach(async item => {
                                                if(item.FIELD1 === "INFORECORD"){
                                                    if(dataRow.at(selRowItem).MATTYP !== item.FIELD2){
                                                        oParamPODATA = {
                                                            EBELN:          "",
                                                            EBELP:          "",
                                                            WEMNG:          "0",
                                                            FOCQTY:         "0",
                                                            TOLALLOWEDIT:   "",
                                                            QTYMIN:         "0",
                                                            QTYMAX:         "0",
                                                            UNTTOMIN:       "0",
                                                            UNTTOMAX:       "0",
                                                            UEBTOMIN:       "0",
                                                            UEBTOMAX:       "0",
                                                        }       
                                                        //exec ZERP_PODATA
                                                        oModel.create("/PODATASet", oParamPODATA, modelParameter);
                                                        _promiseResult = new Promise((resolve, reject)=>{
                                                            oModel.submitChanges({
                                                                groupId: "insert",
                                                                success: function(oData, oResponse){
                                                                    //Success Message
                                                                    resolve();
                                                                },error: function(error){
                                                                    //error message
                                                                    MessageBox.error(error);
                                                                    resolve();
                                                                }
                                                            })
                                                        });
                                                        await _promiseResult;
                                                        //EXEC Info Record
                                                        var infoRecMainParam = {};
                                                        var inforRecReturn = [];
                                                        oParamInfoRec = [];
                                                        oParamInfoRec.push({
                                                            Vendor: vendorCd,
                                                            Material: dataRow.at(selRowItem).MATNO,
                                                            PurchOrg: purchOrg,
                                                            PurGroup: purchGrp,
                                                            Plant: ""
                                                        });
                                                        infoRecMainParam["N_GetInfoRecMatParam"] = oParamInfoRec;
                                                        _promiseResult = new Promise((resolve, reject)=>{
                                                            rfcModel.create("/GetInfoRecordSet", infoRecMainParam, {
                                                                method: "POST",
                                                                success: function(oData, oResponse) {
                                                                    inforRecReturn.push(oData.N_GetInfoRecReturn)
                                                                    resolve();
                                                                },
                                                                error: function(err){
                                                                    resolve();
                                                                }
                                                            });
                                                        });
                                                        await _promiseResult;

                                                        //Populate below
                                                        //Update PO Details Field
                                                        //UEBTO
                                                        //UNTTO
                                                        //UEBTK
                                                        for (var i = 0; i < poDetailsData.length; i++) {
                                                            if (poDetailsData[i].PRNO === dataRow.at(selRowItem).PRNO && poDetailsData[i].PRITM === dataRow.at(selRowItem).PRITM) {
                                                                poDetailsData[i].UNLIMITED = inforRecReturn[0].Unlimited
                                                                poDetailsData[i].OVERDELTOL = inforRecReturn[0].OverDelTol
                                                                poDetailsData[i].UNDERDELTOL = inforRecReturn[0].Under_Tol
                                                            }
                                                        }
                                                    }else{
                                                        forGetGMCPOTol = true;
                                                        //call VPOGetGMCPOTolSet
                                                    }
                                                }
                                            })
                                            resolve();
                                        },
                                        error: function () {
                                            resolve();
                                        }
                                    });
                                });
                                await _promiseResult;

                                //VPOGetGMCPOTolSet
                                var VPOGetGMCPOTolSetResult = []
                                if(forGetGMCPOTol){
                                    //call VPOGetGMCPOTolSet
                                    _promiseResult = new Promise((resolve, reject)=>{
                                        oModel.read("/VPOGetGMCPOTolSet", {
                                            urlParameters: {
                                                "$filter": "MATERIAL eq '" + dataRow.at(selRowItem).MATNO + "'"
                                            },
                                            success: async function (oData, oResponse) {
                                                VPOGetGMCPOTolSetResult.push(oData);
                                                resolve();
                                            },
                                            error: function (){
                                                resolve();
                                            }
                                        });
                                    });
                                    await _promiseResult;

                                    for (var i = 0; i < poDetailsData.length; i++) {
                                        if (poDetailsData[i].PRNO === dataRow.at(selRowItem).PRNO && poDetailsData[i].PRITM === dataRow.at(selRowItem).PRITM) {
                                            if(VPOGetGMCPOTolSetResult.result !== undefined){
                                                poDetailsData[i].UNLIMITED = VPOGetGMCPOTolSetResult.results[0].UNLIMITED
                                                poDetailsData[i].OVERDELTOL = VPOGetGMCPOTolSetResult.results[0].OVERDELTOL
                                                poDetailsData[i].UNDERDELTOL = VPOGetGMCPOTolSetResult.results[0].UNDERDELTOL
                                            }
                                        }
                                    }        
                                }
                            }
                        }
                        
                    })
                })

            },
            onCancelEditPODtls: async function(){
                var me = this;
                if (!this._DiscardChangesDialog) {
                    this._DiscardChangesDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.DiscardChangesDialog", this);
                    this.getView().addDependent(this._DiscardChangesDialog);
                }
                this._DiscardChangesDialog.open();
                // this.showLoadingDialog(_captionList.LOADING);
                // // this.byId("vpoSearchFieldDetails").setVisible(true);
                // this.byId("vpoBtnAddPRtoPO").setVisible(true);
                // this.byId("vpoBtnItemChanges").setVisible(true);
                // this.byId("vpoBtnRefreshDetails").setVisible(true);
                // this.byId("vpoBtnEditDetails").setVisible(true);
                // this.byId("vpoBtnDeleteDetails").setVisible(true);
                // this.byId("vpoBtnSaveLayoutDetails").setVisible(true);
                // this.byId("vpoBtnSaveDetails").setVisible(false);
                // this.byId("vpoBtnCancelDetails").setVisible(false);

                // this.enableOtherTabsChild("idIconTabBarInlineMode");
                // this.enableOtherTabsChild("vpoHeaderTxtIconTab");
                // this.byId("vpoDelSchedIconTab").setEnabled(true);
                // this.byId("vpoDelInvIconTab").setEnabled(true);
                // this.byId("vpoPoHistIconTab").setEnabled(true);
                // this.byId("vpoConditionsIconTab").setEnabled(true);
                // this.validationErrors = [];

                // _promiseResult = new Promise((resolve, reject)=>{
                //     resolve(me.loadAllData());
                // });
                // await _promiseResult;

                // this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                // this.closeLoadingDialog(that);
                // var me = this;
                // if (this._isEdited) {

                //     if (!this._DiscardChangesDialog) {
                //         this._DiscardChangesDialog = sap.ui.xmlfragment("zuivendorpo.view.fragments.dialog.DiscardChangesDialog", this);
                //         this.getView().addDependent(this._DiscardChangesDialog);
                //     }
                //     this._DiscardChangesDialog.open();
                // }else{
                //     this.showLoadingDialog(_captionList.LOADING);
                //     // this.byId("vpoSearchFieldDetails").setVisible(true);
                //     this.byId("vpoBtnAddPRtoPO").setVisible(true);
                //     this.byId("vpoBtnItemChanges").setVisible(true);
                //     this.byId("vpoBtnRefreshDetails").setVisible(true);
                //     this.byId("vpoBtnEditDetails").setVisible(true);
                //     this.byId("vpoBtnDeleteDetails").setVisible(true);
                //     this.byId("vpoBtnSaveLayoutDetails").setVisible(true);
                //     this.byId("vpoBtnSaveDetails").setVisible(false);
                //     this.byId("vpoBtnCancelDetails").setVisible(false);

                //     this.enableOtherTabsChild("idIconTabBarInlineMode");
                //     this.enableOtherTabsChild("vpoHeaderTxtIconTab");
                //     this.byId("vpoDelSchedIconTab").setEnabled(true);
                //     this.byId("vpoDelInvIconTab").setEnabled(true);
                //     this.byId("vpoPoHistIconTab").setEnabled(true);
                //     this.byId("vpoConditionsIconTab").setEnabled(true);
                //     // this.byId("vpoNewHdrTxtRemarks").setEnabled(true);
                //     // this.byId("vpoEditHdrTxtRemarks").setEnabled(true);
                //     // this.byId("vpoDeleteHdrTxtRemarks").setEnabled(true);

                //     // this.byId("vpoHdrMenuBtn").setEnabled(true);
                //     // this.byId("vpoBtnEditHeader").setEnabled(true);
                //     // this.byId("vpoBtnRefreshtHeader").setEnabled(true);

                //     // this.byId("vpoNewHdrTxtPkgInst").setEnabled(true);
                //     // this.byId("vpoEditHdrTxtPkgInst").setEnabled(true);
                //     // this.byId("vpoDeleteHdrTxtPkgInst").setEnabled(true);
                //     this.validationErrors = [];

                //     _promiseResult = new Promise((resolve, reject)=>{
                //         resolve(me.loadAllData());
                //     });
                //     await _promiseResult;
                //     // if (this.getView().getModel("ui").getData().dataMode === 'NEW') this.setFilterAfterCreate();

                //     this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                //     this.closeLoadingDialog(that);
                // }
            },
            onCloseDiscardChangesDialog: async function(){
                var me = this;
                this._DiscardChangesDialog.close();
                Common.openLoadingDialog(that);
                // this.byId("vpoSearchFieldDetails").setVisible(true);
                this.byId("vpoBtnAddPRtoPO").setVisible(true);
                this.byId("vpoBtnItemChanges").setVisible(true);
                this.byId("vpoBtnRefreshDetails").setVisible(true);
                this.byId("vpoBtnEditDetails").setVisible(true);
                this.byId("vpoBtnDeleteDetails").setVisible(true);
                this.byId("vpoBtnSaveLayoutDetails").setVisible(true);
                this.byId("vpoBtnSaveDetails").setVisible(false);
                this.byId("vpoBtnCancelDetails").setVisible(false);

                this.enableOtherTabsChild("idIconTabBarInlineMode");
                this.enableOtherTabsChild("vpoHeaderTxtIconTab");
                this.byId("vpoDetailsIconTab").setEnabled(true);
                this.byId("vpoDelSchedIconTab").setEnabled(true);
                this.byId("vpoDelInvIconTab").setEnabled(true);
                this.byId("vpoPoHistIconTab").setEnabled(true);
                this.byId("vpoConditionsIconTab").setEnabled(true);
                this.byId("vpoReceiptsIssuancesIconTab").setEnabled(true);

                this.byId("vpoBtnLineSplit").setVisible(true);
                this.byId("vpoBtnEditDelSched").setVisible(true);
                this.byId("vpoBtnSaveDelSched").setVisible(false);
                this.byId("vpoBtnCancelDelSched").setVisible(false);
                this.byId("vpoBtnDeleteDelSched").setVisible(true);
                this.byId("vpoBtnRefresDelSched").setVisible(true);
                this.byId("vpoBtnExportToExcelDelSched").setVisible(true);

                this.byId("vpoBtnUpdatePrice").setVisible(true);
                this.byId("vpoBtnDelCompleteDetails").setVisible(true);
                this.byId("vpoBtnCancelDelInv").setVisible(false);

                this.byId("vpoBtnRefresDelInv").setVisible(true);
                this.byId("vpoBtnEditDelInv").setVisible(true);
                this.byId("vpoBtnSaveDelInv").setVisible(false)
                this.byId("vpoBtnExportToExcelDelInv").setVisible(true);

                // this.getView().getModel("TableData").setProperty("/", this._oDataBeforeChange);
                _promiseResult = new Promise((resolve, reject)=>{
                    resolve(me.loadAllData());
                });
                await _promiseResult;
                Common.closeLoadingDialog(that);
                this._validationErrors = [];
                this._DiscardChangesDialog.close();
                this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                this._isEdited = false;
                // var me = this;
                // if (this._isEdited) {
                //     this._DiscardChangesDialog.close();
                //     this.showLoadingDialog(_captionList.LOADING);
                //     // this.byId("vpoSearchFieldDetails").setVisible(true);
                //     this.byId("vpoBtnAddPRtoPO").setVisible(true);
                //     this.byId("vpoBtnItemChanges").setVisible(true);
                //     this.byId("vpoBtnRefreshDetails").setVisible(true);
                //     this.byId("vpoBtnEditDetails").setVisible(true);
                //     this.byId("vpoBtnDeleteDetails").setVisible(true);
                //     this.byId("vpoBtnSaveLayoutDetails").setVisible(true);
                //     this.byId("vpoBtnSaveDetails").setVisible(false);
                //     this.byId("vpoBtnCancelDetails").setVisible(false);

                //     this.enableOtherTabsChild("idIconTabBarInlineMode");
                //     this.enableOtherTabsChild("vpoHeaderTxtIconTab");
                //     this.byId("vpoDelSchedIconTab").setEnabled(true);
                //     this.byId("vpoDelInvIconTab").setEnabled(true);
                //     this.byId("vpoPoHistIconTab").setEnabled(true);
                //     this.byId("vpoConditionsIconTab").setEnabled(true);

                //     // this.getView().getModel("TableData").setProperty("/", this._oDataBeforeChange);
                //     _promiseResult = new Promise((resolve, reject)=>{
                //         resolve(me.loadAllData());
                //     });
                //     await _promiseResult;
                //     this.closeLoadingDialog(that);
                // }
                // this.validationErrors = [];
                // this._DiscardChangesDialog.close();
                // this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                // this._isEdited = false;

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
                    MessageBox.error(_captionList.INFO_PO_LINE_CANNOT_BE_DELETED)
                    bProceed = false;
                }
                // this.getView().getModel("VPODtlsVPODet").getProperty("/results").forEach(item => {
                //     if(item.DELETED || item.CLOSED){
                //         MessageBox.error(_captionList.INFO_PO_CLOSED_DELETED)
                //         bProceed = false;
                //     }
                // });
                if(bProceed){
                    Common.openLoadingDialog(that);
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

                    var topHeaderData = this.getView().getModel("topHeaderData").getData();

                    var shipToPlant = topHeaderData.SHIPTOPLANT;//this.byId("f1ShipToPlant").getValue().split('-')[0].trim();
                    var incoTerms = topHeaderData.INCOTERMS;//this.byId("f1Incoterms").getValue().split('-')[0].trim();
                    var destination = topHeaderData.DEST;//this.byId("f1Destination").getValue();
                    var shipMode = topHeaderData.SHIPMODE;//this.byId("f1ShipMode").getValue().split('-')[0].trim();

                    if(oSelectedIndices.length > 0){
                        oSelectedIndices.forEach(item => {
                            oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                        })
                        oSelectedIndices = oTmpSelectedIndices;
                        oSelectedIndices.forEach((item, index) => {
                            if (aData.at(item).DELETED === true || aData.at(item).CLOSED) {
                                bProceed = false;
                            }
                            if(bProceed){
                                oParamInitParam = {
                                    IPoNumber: me._pono,
                                    IDoDownload: "N",
                                    IChangeonlyHdrplants: "N",
                                }
                                oParamDataPO.push({
                                    Banfn: aData.at(item).PRNO, //PRNO
                                    Bnfpo: aData.at(item).PRITM, //PRITM
                                    Ebeln: me._pono,//pono
                                    Unsez: shipToPlant, //shipToPlant
                                    Inco1: incoTerms, // Incoterms
                                    Inco2: destination, //Destination
                                    Evers: shipMode, //ShipMode
                                    Ebelp: aData.at(item).ITEM,//poitem
                                    Txz01: aData.at(item).SHORTTEXT,//shorttext
                                    Menge: aData.at(item).POQTY,//QTY
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
                            }else{
                                MessageBox.error(_captionList.INFO_PO_CLOSED_DELETED);
                            }
                        });

                        if (oParamDataPO.length > 0) {
                            oParam = oParamInitParam;
                            oParam['N_ChangePOItemParam'] = oParamDataPO;
                            oParam['N_ChangePOClosePRParam'] = oParamDataPOClose;
                            oParam['N_ChangePOReturn'] = [];
                            _promiseResult = new Promise((resolve, reject)=>{
                                oModel.create("/ChangePOSet", oParam, {
                                    method: "POST",
                                    success: async function(oData, oResponse){
                                        if(oData.N_ChangePOReturn.results.length > 0){
                                            if(oData.N_ChangePOReturn.results[0].Msgtyp === 'E'){
                                                message = oData.N_ChangePOReturn.results[0].Msgv1;
                                                MessageBox.error(message);
                                                resolve()
                                            }else{
                                                message = oData.N_ChangePOReturn.results[0].Msgv1;
                                                MessageBox.information(message);
                                                await new Promise((resolve, reject)=>{
                                                    resolve(me.loadAllData())
                                                });
                                                resolve()
                                            }   
                                        }else{
                                            MessageBox.error(_captionList.INFO_NO_DTLS_TO_DELETE);
                                        }
                                    },error: function(error){
                                        MessageBox.error(error);
                                    }
                                })
                            });
                            await _promiseResult;
                        }
                    }else{
                        MessageBox.error(this.getView().getModel("captionMsg").getData()["INFO_NO_DATA_DELETE"]);
                    }

                    Common.closeLoadingDialog(that);

                }
            },

            onAddPRtoPODtls: async function(){
                var me = this;
                var poNo = this._pono;
                var bProceed = true;
                // var isValid = false

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
                    MessageBox.error(_captionList.INFO_PO_NOT_VALID_TO_EDIT)
                    bProceed = false;
                    return;
                }

                // this.getView().getModel("VPODtlsVPODet").getProperty("/results").forEach(item => {
                //     if(bProceed){
                //         if(!isValid){
                //             if(item.DELETED !== true && item.CLOSED !== true){
                //                 bProceed = true;
                //                 isValid = true;
                //             }else{
                //                 bProceed = false;
                //             }
                //         }
                //     }
                // })
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
                                    "SHIPTOPLANT eq '"+ shipToPlant +"' and PURCHPLANT eq '"+ purchPlant +"' and PODOCTYP eq '"+ docType +"'"
                            // "$filter": "VENDORCD eq '0003101604' and PURCHORG eq '1601' and PURCHGRP eq '601' and SHIPTOPLANT eq 'B601' and PURCHPLANT eq 'C600' and DOCTYP eq 'ZMRP'"
                        },
                        success: async function (oData, oResponse) {
                            
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
                }else{
                    MessageBox.error(_captionList.INFO_PO_INVALID_ADD_PR_TO_PO)
                }
            },
            onSaveAddPRtoPO: async function(){
                var me = this;
                var poNo = this._pono;

                // var vendorCd = ''; 
                // var purchOrg = '';
                // var purchGrp = '';
                // var inco1 = ''
                // var inco2 = ''
                // var currency = ''
                // var paymentTerms = ''
                // var shipToPlant = '';
                // var purchPlant = '';
                // var docType = '';

                var oTable = this.byId("vpoAddPRtoPOTbl");
                var aSelIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;

                var headerPOArr = [];

                var oParamInitParam = {};
                var oParamDataPO = [];
                var oParam;
                var oParamClosePR = [];

                var rfcModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var oModel = this.getOwnerComponent().getModel();

                var topHeaderData = this.getView().getModel("topHeaderData").getData();

                var shipToPlant = topHeaderData.SHIPTOPLANT;//this.byId("f1ShipToPlant").getValue().split('-')[0].trim();
                var incoTerms = topHeaderData.INCOTERMS;//this.byId("f1Incoterms").getValue().split('-')[0].trim();
                var destination = topHeaderData.DEST;//this.byId("f1Destination").getValue();
                var shipMode = topHeaderData.SHIPMODE;//this.byId("f1ShipMode").getValue().split('-')[0].trim();
                var message;
                var bProceed = true

                var poItemArr = [];
                var poItemLastCnt = 0;

                var infoRecMainParam = {};
                var inforRecReturn = [];
                var oParamInfoRec = [];
                var inforRecMessage = "";

                Common.openLoadingDialog(that);
                
                _promiseResult = new Promise((resolve, reject)=>{
                    oModel.read("/mainSet(PONO='" + poNo + "')", {
                        success: function (oData, oResponse) {
                            // vendorCd= oData.VENDOR; 
                            // purchOrg= oData.PURCHORG;
                            // purchGrp= oData.PURCHGRP;
                            // shipToPlant= oData.SHIPTOPLANT;
                            // purchPlant= oData.PURCHPLANT;
                            // docType= oData.DOCTYPE;
                            // inco1 = oData.INCOTERMS;
                            // inco2 = oData.DEST;
                            // currency = oData.CURRENCY
                            // paymentTerms = oData.PAYMNTTERMS
                            if (oData.PODT !== null)
                                oData.PODT = dateFormat.format(new Date(oData.PODT));
                            headerPOArr.push(oData);
                            resolve();
                        },
                        error: function () {
                            MessageBox.error("Error Encountered.")
                            //error message
                            bProceed = false;
                            resolve();
                        }
                    });
                });
                await _promiseResult;

                if(aSelIndices.length === 0 && bProceed){
                    MessageBox.error(_captionList.INFO_NO_RECORD_SELECT)
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

                    aSelIndices.forEach(async (item, index) => {

                        if(headerPOArr[0].VENDOR === undefined || headerPOArr[0].VENDOR === "" || headerPOArr[0].VENDOR === null){
                            oParamInfoRec = [];
                            inforRecReturn = [];
                            var mengeComputed = 0;
                            oParamInfoRec.push({
                                Vendor: "",//headerPOArr[0].VENDOR,
                                Material: aData.at(item).MATNO,
                                PurchOrg: headerPOArr[0].PURCHORG,
                                Plant: headerPOArr[0].PURCHPLANT,
                                PurGroup: headerPOArr[0].PURCHGRP
                            });
                            infoRecMainParam["N_GetInfoRecMatParam"] = oParamInfoRec;

                            await new Promise((resolve, reject)=>{
                                rfcModel.create("/GetInfoRecordSet", infoRecMainParam, {
                                    method: "POST",
                                    success: function(oData, oResponse) {
                                        inforRecReturn.push(oData.N_GetInfoRecReturn)
                                        resolve();
                                    },
                                    error: function(err){
                                        reject();
                                    }
                                });
                            });

                            if(inforRecReturn.Ret_Type === "E"){
                                inforRecMessage = inforRecReturn.Ret_Message + "\n"
                            }else{
                                if(aData.at(item).UOM !== inforRecReturn.OrderPR_Un){
                                    mengeComputed = (aData.at(item).QTY/inforRecReturn.Conv_Num1) * (inforRecReturn.Conv_Den1 *inforRecReturn.Price_Unit)
                                }else{
                                    mengeComputed = aData.at(item).QTY;
                                }
    
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
                                    // Ekorg     : aData.at(item).PURCHORG,
                                    // Lifnr     : aData.at(item).VENDORCD,
                                    // Ekgrp     : aData.at(item).PURCHGRP,
                                    // Inco1     : inco1,
                                    // Inco2     : inco2,
                                    // Waers     : currency,
                                    // Zterm     : paymentTerms,
                                    Ebeln     : poNo, //PONO
                                    Ebelp     : poItemLastCnt, //POITM
                                    Unsez     : shipToPlant, //shipToPlant
                                    Inco1     : incoTerms, // Incoterms
                                    Inco2     : destination, //Destination
                                    Evers     : shipMode, //ShipMode
                                    Bukrs     : headerPOArr[0].COMPANY,//COCD
                                    Werks     : headerPOArr[0].PURCHPLANT,//PLANTCD
                                    Unsez     : headerPOArr[0].SHIPTOPLANT,//
                                    Matnr     : aData.at(item).MATNO, //MatNo
                                    Charg     : aData.at(item).IONO,
                                    Txz01     : aData.at(item).SHORTTEXT,//ShortText
                                    Menge     : mengeComputed, //aData.at(item).QTY,//OrdQTY
                                    Meins     : aData.at(item).UOM,//UOM
                                    Netpr     : aData.at(item).NETPRICE,//net price
                                    Repos     : true, //aData.at(item).INVRCPTIND, //IR Indicator
                                    Webre     : true, //aData.at(item).GRBASEDIVIND, //GR Based Ind
                                    Eindt     : sapDateFormat.format(new Date(aData.at(item).DELDT)) + "T00:00:00", //DlvDt
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
                                oParamClosePR.push({
                                    Banfn: aData.at(item).PRNO, //PRNO
                                    Bnfpo: aData.at(item).PRITM //PRITM
                                })
    
                                poItemLastCnt = String(parseInt(poItemLastCnt) + 10);
    
                                if(poItemLastCnt != "" || poItemLastCnt != null){
                                    while(poItemLastCnt.length < 5) poItemLastCnt = "0" + poItemLastCnt.toString();
                                }
                            }
                            
                            
                        }else{
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
                                // Ekorg     : aData.at(item).PURCHORG,
                                // Lifnr     : aData.at(item).VENDORCD,
                                // Ekgrp     : aData.at(item).PURCHGRP,
                                // Inco1     : inco1,
                                // Inco2     : inco2,
                                // Waers     : currency,
                                // Zterm     : paymentTerms,
                                Ebeln     : poNo, //PONO
                                Ebelp     : poItemLastCnt, //POITM
                                Unsez     : shipToPlant, //shipToPlant
                                Inco1     : incoTerms, // Incoterms
                                Inco2     : destination, //Destination
                                Evers     : shipMode, //ShipMode
                                Bukrs     : headerPOArr[0].COMPANY,//COCD
                                Werks     : headerPOArr[0].PURCHPLANT,//PLANTCD
                                Unsez     : headerPOArr[0].SHIPTOPLANT,//
                                Matnr     : aData.at(item).MATNO, //MatNo
                                Charg     : aData.at(item).IONO,
                                Txz01     : aData.at(item).SHORTTEXT,//ShortText
                                Menge     : aData.at(item).QTY,//OrdQTY
                                Meins     : aData.at(item).UOM,//UOM
                                Netpr     : aData.at(item).NETPRICE,//net price
                                Repos     : true, //aData.at(item).INVRCPTIND, //IR Indicator
                                Webre     : true, //aData.at(item).GRBASEDIVIND, //GR Based Ind
                                Eindt     : sapDateFormat.format(new Date(aData.at(item).DELDT)) + "T00:00:00", //DlvDt
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
                            oParamClosePR.push({
                                Banfn: aData.at(item).PRNO, //PRNO
                                Bnfpo: aData.at(item).PRITM //PRITM
                            })

                            poItemLastCnt = String(parseInt(poItemLastCnt) + 10);

                            if(poItemLastCnt != "" || poItemLastCnt != null){
                                while(poItemLastCnt.length < 5) poItemLastCnt = "0" + poItemLastCnt.toString();
                                
                            }
                        }
                    });

                    if(oParamDataPO.length > 0){
                        oParam = oParamInitParam;
                        oParam['N_ChangePOItemParam'] = oParamDataPO;
                        oParam['N_ChangePOReturn'] = [];
                        oParam['N_ChangePOClosePRParam'] = oParamClosePR;
                        _promiseResult = new Promise((resolve, reject)=>{
                            rfcModel.create("/ChangePOSet", oParam, {
                                method: "POST",
                                success: async function(oData, oResponse){
                                    if(oData.N_ChangePOReturn.results.length > 0){
                                        const lastKey = oData.N_ChangePOReturn.results.length - 1;
                                        if(oData.N_ChangePOReturn.results[lastKey].Msgtyp === "E"){
                                            message = oData.N_ChangePOReturn.results[lastKey].Msgv1;
                                            MessageBox.error(message);
                                            resolve()
                                        }else{
                                            message = oData.N_ChangePOReturn.results[0].Msgv1;
                                            MessageBox.information(message);
                                            me.addPRToPODialog.destroy(true);
                                            await new Promise((resolve, reject)=>{
                                                resolve(me.loadAllData())
                                            });
                                            resolve()
                                        }
                                    }else{
                                        MessageBox.error(_captionList.INFO_NO_DATA_MODIFIED);
                                        resolve()
                                    }
                                },error: function(error){
                                    //error message
                                    MessageBox.error(_captionList.INFO_NO_DATA_MODIFIED);
                                    resolve()
                                }
                            })
                        });
                        await _promiseResult;
                    }

                    if(inforRecMessage !== ""){
                        MessageBox.error(inforRecMessage);
                    }
                }
                    
                Common.closeLoadingDialog(that);
                
            },
            onCancelAddPRtoPO: async function(){
                this.addPRToPODialog.destroy(true);
            },

            onRefresh: async function(){
                Common.openLoadingDialog(that);
                _promiseResult = new Promise((resolve, reject)=> {
                    resolve(this.loadAllData());
                });
                await _promiseResult;
                var poItem = this.getView().getModel("ui").getProperty("/activePOItem"); 
                this.getProcessFlow(poItem);
                Common.closeLoadingDialog(that);
            },

            onCellClick: async function(oEvent) {
                var sRowPath = oEvent.getParameters().rowBindingContext.sPath;
                sRowPath = "/results/"+ sRowPath.split("/")[2];
                var oRow;
                var oTable;
                var poNo = this._pono;
                var me = this;

                if(oEvent.getParameters().id.includes("vpoDetailsTab")){
                    oRow = this.getView().getModel("VPODtlsVPODet").getProperty(sRowPath)
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
                    oRow = this.getView().getModel("VPODelSchedVPODet").getProperty(sRowPath)
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
                    oTable.clearSelection();
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
                    oTable.clearSelection();
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
                }else if(oEvent.getParameters().id.includes("vpoReceiptsIssuancesTab")){
                    oRow = this.getView().getModel("VPOReceiptsIssuancesVPODet").getProperty(sRowPath)
                    oTable = this.byId("vpoReceiptsIssuancesTab");
                    oTable.clearSelection();
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
                if((oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") && oEvent.srcControl.sParentAggregationName === "rows"){// && _dataMode === "READ") {
                    var sRowPath = this.byId(oEvent.srcControl.sId).oBindingContexts["undefined"].sPath;
                    sRowPath = "/results/"+ sRowPath.split("/")[2];
                    var index = sRowPath.split("/");
                    var oRow;
                    var oTable;

                    if(oEvent.srcControl.sId.includes("vpoDetailsTab")){
                        oRow = this.getView().getModel("VPODtlsVPODet").getProperty(sRowPath);
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

                    }
                    if(oEvent.srcControl.sId.includes("vpoDelSchedTab")){
                        oRow = this.getView().getModel("VPODelSchedVPODet").getProperty(sRowPath);
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

                    }
                    if(oEvent.srcControl.sId.includes("vpoDelInvTab")){
                        oRow = this.getView().getModel("VPODelInvVPODet").getProperty(sRowPath);
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

                    }
                    if(oEvent.srcControl.sId.includes("vpoPoHistTab")){
                        oRow = this.getView().getModel("VPOPOHistVPODet").getProperty(sRowPath);
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

                    }
                    if(oEvent.srcControl.sId.includes("vpoConditionsTab")){
                        oRow = this.getView().getModel("VPOCondVPODet").getProperty(sRowPath);
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
                    if(oEvent.srcControl.sId.includes("vpoReceiptsIssuancesTab")){
                        oRow = this.getView().getModel("VPOReceiptsIssuancesVPODet").getProperty(sRowPath);
                        oTable = this.byId("vpoReceiptsIssuancesTab")
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

            onKeyUpDelInv: async function(){
                var me = this;
                var count = 0;
                var oRow = this.getView().getModel("VPODelInvVPODet");
                var oTable = this.byId("vpoDelInvTab");
                var iSelectedIndex = oTable.getSelectedIndex();
                var poItem = this.getView().getModel("ui").getProperty("/activePOItem");
                if (iSelectedIndex > 0) {
                    var selectedIndexCount = iSelectedIndex - 1;
                    let sPath = "/results/"+ selectedIndexCount +""
                    oRow = this.getView().getModel("VPODelInvVPODet").getProperty(sPath);
                    oTable.setSelectedIndex(iSelectedIndex - 1);
                    this.getView().getModel("ui").setProperty("/activePOItem", oRow.ITEM)
                }

            },

            onKeyDownDelInv: async function(){
                var me = this;
                var count = 0;
                var oRow = this.getView().getModel("VPODelInvVPODet");
                var oTable = this.byId("vpoDelInvTab");
                var iSelectedIndex = oTable.getSelectedIndex();
                var iVisibleRowCount = oTable.getVisibleRowCount();
                var poItem = this.getView().getModel("ui").getProperty("/activePOItem");
                if (iSelectedIndex < iVisibleRowCount - 1) {
                    var selectedIndexCount = iSelectedIndex + 1;
                    let sPath = "/results/"+ selectedIndexCount +""
                    oRow = this.getView().getModel("VPODelInvVPODet").getProperty(sPath);
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
                if(this._poHistPOItemCount <= this._poItemStore.length){
                    this._poHistPOItemCount--;
                    var poItem = this._poItemStore[this._poHistPOItemCount].poItem;
                    var matNo = this._poItemStore[this._poHistPOItemCount].matNo;
                    var shortText = this._poItemStore[this._poHistPOItemCount].shortText;

                    this.getView().getModel("ui").setProperty("/activePOItem", poItem);
                    await this.getPOHistory2(poNo, poItem)
                    await this.setTableColumnsData("VPOHISTORY");
                    
                }
            },
            onKeyDownPOHistory: async function(){
                var me = this;
                var poNo = this.getView().getModel("ui").getProperty("/activePONo");
                
                if (this._poHistPOItemCount ===  this._poItemStore.length -1) {
                    this._poHistPOItemCount--;
                }

                if(this._poHistPOItemCount != this._poItemStore.length - 1){
                    this._poHistPOItemCount++;
                    var poItem = this._poItemStore[this._poHistPOItemCount].poItem;
                    var matNo = this._poItemStore[this._poHistPOItemCount].matNo;
                    var shortText = this._poItemStore[this._poHistPOItemCount].shortText;

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

            
            onKeyUpProcFlow: async function(){
                var me = this;
                var poNo = this.getView().getModel("ui").getProperty("/activePONo");

                if (this._procFlowPOItemCount <= 0) {
                    this._procFlowPOItemCount++;
                }
                if(this._procFlowPOItemCount <= this._poItemStore.length){
                    this._procFlowPOItemCount--;
                    var poItem = this._poItemStore[this._procFlowPOItemCount].poItem;

                    this.getView().getModel("ui").setProperty("/activePOItem", poItem);
                    await this.getProcessFlow(poItem);
                    
                }
            },
            onKeyDownProcFlow: async function(){
                var me = this;
                var poNo = this.getView().getModel("ui").getProperty("/activePONo");
                
                if (this._procFlowPOItemCount ===  this._poItemStore.length -1) {
                    this._procFlowPOItemCount--;
                }

                if(this._procFlowPOItemCount != this._poItemStore.length - 1){
                    this._procFlowPOItemCount++;
                    var poItem = this._poItemStore[this._procFlowPOItemCount].poItem;

                    this.getView().getModel("ui").setProperty("/activePOItem", poItem);
                    await this.getProcessFlow(poItem);
                    
                }
            },

            onChangeMatNoPODtls: async function(){
                var me = this;

                await new Promise((resolve)=>{
                    resolve(me.validatePOChange());
                });

                if(this._validPOChange != 1){
                    MessageBox.error(_captionList.INFO_PO_NOT_VALID_TO_EDIT)
                    return;
                }

                var oModel = this.getOwnerComponent().getModel();
                var oTable = this.byId("vpoDetailsTab");
                var aSelIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var vMatno, vBatch = "";
                var vGMC, vIONO = "";

                this._storePODetChangeMatNo = [];//initialise Object to Store PO Det Data;

                var aData = this.getView().getModel("VPODtlsVPODet").getData().results;

                //Change Material View Variables
                var oChangeMatNoData = [];
                var oJSONModel = new JSONModel();

                if (aSelIndices.length === 1) {
                    aSelIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    });

                    aSelIndices = oTmpSelectedIndices;

                    for(var item of aSelIndices){
                        vMatno = aData.at(item).MATNO;
                        vBatch = aData.at(item).BATCH;
                        await new Promise((resolve)=>{
                            oModel.read("/ChangeMatNoGetGMCIOSet",{
                                urlParameters: {
                                    "$filter": "MATNO eq '" + vMatno + "' and BATCH eq '"+ vBatch +"'"
                                },
                                success: async function (data, response) {
                                    if(data.results.length > 0){
                                        vGMC = data.results[0].GMCDESCEN;
                                        vIONO = data.results[0].IONO;
                                    }
                                    resolve();
                                },error: function(error){
                                    //error occured
                                    resolve();
                                }

                            });
                        });
                        me._storePODetChangeMatNo = aData.at(item);
                    }

                    if(vGMC !== "" && vGMC !== null && vGMC !== undefined){
                        if(vIONO !== "" && vIONO !== null && vIONO !== undefined){
                            await new Promise((resolve)=>{
                                oModel.read("/ChangeMatNoDataSet",{
                                    urlParameters: {
                                        "$filter": "GMCDESCEN eq '" + vGMC + "' and IONO eq '"+ vIONO +"'"
                                    },
                                    success: async function (data, response) {
                                        oChangeMatNoData = data.results;
                                        resolve();
                                    },error: function(error){
                                        resolve();
                                        //error occured
                                    }
        
                                });
                            })
                        }
                    }
                    console.log(oChangeMatNoData);
                    if(oChangeMatNoData.length > 0){
                        me.changeMaterialDialog = sap.ui.xmlfragment(me.getView().getId(), "zuivendorpo.view.fragments.dialog.ChangeMaterialDialog", me);
                        me.changeMaterialDialog.setModel(
                            new JSONModel({
                                Title: "Change Material"
                            }) 
                        );
                        me.getView().addDependent(me.changeMaterialDialog);

                        oJSONModel.setData(oChangeMatNoData);
                        me.getView().setModel(oJSONModel, "VPOChangeMaterialData");

                        await me.getDynamicColumns('VPOCHANGEMAT','ZDV_VPOCHMATNO')

                        me.changeMaterialDialog.open();
                    }
                }else{

                }
            },

            onChangeMaterial: async function(){
                var me = this;

                var oTable = this.byId("vpoChangeMatTbl");
                var aSelIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;
                var oModel = this.getOwnerComponent().getModel();

                var prModel = this.getOwnerComponent().getModel("ZGW_3DERP_PR_SRV");
                var rfcModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var vSBU = this._sbu;

                var chkInfoRec = false, chkSourceList = false; //check Info Rec/Src List if Required
                var validInfoRec = false, validSourceList = false; //check if there is exisiting InfoRec/SrcList
                var poDetData = this._storePODetChangeMatNo;
                console.log(poDetData);
                console.log(this.getView().getModel("topHeaderData").getData());
                var sPlantCd = this.getView().getModel("topHeaderData").getData().PURCHPLANT;
                var sVendorCd = this.getView().getModel("topHeaderData").getData().VENDOR;
                var sPurchOrg = this.getView().getModel("topHeaderData").getData().PURCHORG

                var bProceed = true;

                //Create PR Variables
                var prCreateSetParamSet = {}
                var prCreateSetParamMain = {}
                var prCreateSetParam = []

                var prData = []; //store PR of PO
                var prItems = 0;

                //save PO and delete PO Variables
                var poNo = me._pono
                var oParamInitParam = {}
                var oParamDataPO = [];
                var oParamDataPOClose = [];
                var oParam = {};
                var topHeaderData = this.getView().getModel("topHeaderData").getData();
                var shipToPlant = topHeaderData.SHIPTOPLANT;//this.byId("f1ShipToPlant").getValue().split('-')[0].trim();
                var incoTerms = topHeaderData.INCOTERMS;//this.byId("f1Incoterms").getValue().split('-')[0].trim();
                var destination = topHeaderData.DEST;//this.byId("f1Destination").getValue();
                var shipMode = topHeaderData.SHIPMODE;//this.byId("f1ShipMode").getValue().split('-')[0].trim();

                //validation if PR/PO Created
                var prCreated = false;
                var poCreated = false;
                var bError = false;
                var bSuccess = false;

                var vData = [];
                var message = "";

                if (aSelIndices.length > 0) {
                    aSelIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    });

                    aSelIndices = oTmpSelectedIndices;

                    for(var item of aSelIndices){
                        vData.push(aData.at(item));
                    }
                    Common.openLoadingDialog(me);
                    //check in ZERP_CHECK if SourceList or InfoRecord is required. 
                    //InfoRecord
                    await new Promise((resolve)=>{
                        oModel.read("/ZERP_CHECKSet", {
                            urlParameters: {
                                "$filter": "SBU eq '" + vSBU + "'"
                            },
                            success: function (oData, oResponse) {
                                for(var x in oData.results){
                                    if(oData.results[x].FIELD1 === "INFORECORD" && poDetData.MATTYP === oData.results[x].FIELD2){
                                        chkInfoRec = true;
                                    }
                                }
                                resolve();
                            },
                            error: function () {
                                resolve();
                            }
                        });
                    });

                    //SourceList
                    await new Promise((resolve)=>{
                        oModel.read("/ZERP_CHECKSet", {
                            urlParameters: {
                                "$filter": "SBU eq '" + vSBU + "'"
                            },
                            success: function (oData, oResponse) {
                                for(var x in oData.results){
                                    if(oData.results[x].FIELD1 === "SOURCELIST" && poDetData.MATTYP === oData.results[x].FIELD2){
                                        chkSourceList = true;
                                    }
                                }
                                resolve();
                            },
                            error: function () {
                                resolve();
                            }
                        });
                    });


                    if(chkInfoRec){
                        if(poDetData.PURCHINFOREC === "" && poDetData.PURCHINFOREC === null && poDetData.PURCHINFOREC === undefined){
                            bProceed = false;
                        }
                        if(!bProceed){
                            console.log("Info Rec is Required!");
                        }
                    }

                    
                    if(chkSourceList){
                        await new Promise((resolve)=>{
                            oModel.read("/ChangeMatNoGetSrcListSet", {
                                urlParameters: {
                                    "$filter": "MATNO eq '" + poDetData.MATNO + "' and PURCHPLANT eq '" + sPlantCd + "'  and VENDOR eq '" + sVendorCd + "'  and PURCHORG eq '" + sPurchOrg + "'"
                                },
                                success: function (oData, oResponse) {

                                    if(oData.results.length){
                                        bProceed = false;
                                    }
                                    resolve();
                                },
                                error: function () {
                                    resolve();
                                }
                            });
                            if(!bProceed){
                                console.log("No Source List Found!");
                            }
                        })
                        
                    }

                    if(bProceed){
                        //Lock in ZERP_MRPDATA
                        
                        //get PR and count PR Items
                        await new Promise((resolve, reject) => {
                            prModel.read("/PRSet", {//"/PRSet(PRNO='" + prno + "',PRITM='"+ pritm +"')", {
                                success: async function (oData, oResponse) {
                                    if (oData.results.length > 0) {
                                        oData.results.forEach((item, index) => {
                                            item.DELETED = item.DELETED === "" ? false : true;
                                            item.CREATEDDT = dateFormat.format(new Date(item.CREATEDDT));
                                            item.UPDATEDDT = dateFormat.format(new Date(item.UPDATEDDT));
                                            item.RELDT = dateFormat.format(new Date(item.RELDT));
                                            item.REQDT = dateFormat.format(new Date(item.REQDT));
                                            item.DELDT = dateFormat.format(new Date(item.DELDT));
                                        })
                                        
                                        //get PR Items
                                        for(var item in oData.results){
                                            if(oData.results[item].PRNO === poDetData.PRNO){
                                                prData.push(oData.results[item]);
                                            }
                                        }
                                    }
                                    resolve();
                                },
                                error: function () {
                                    resolve();
                                }
                            })
                        });

                        var prItemArr = [];
                        for(var x = 0; x < prData.length; x++){
                            prItemArr.push(prData[x].PRITM);
                        }

                        prItemArr.sort((a, b) => {return b - a});
                        var prItemIncrement = String(parseInt(prItemArr[0]) + 10);

                        if(prItemIncrement != "" || prItemIncrement != null){
                            while(prItemIncrement.length < 5) prItemIncrement = "0" + prItemIncrement.toString();
                            
                        }

                        for(var item in prData){
                            if(poDetData.PRNO === prData[item].PRNO && poDetData.PRITM === prData[item].PRITM){
                                //Insert PR Line Item
                                prCreateSetParam.push({
                                    PreqNo: poDetData.PRNO,
                                    PreqItem: prItemIncrement,
                                    Matno: vData[0].MATNO,
                                    Uom: vData[0].BASEUOM,
                                    Quantity: vData[0].REQDQTY,
                                    DelivDate: sapDateFormat.format(new Date(prData[item].DELDT)) + "T00:00:00",
                                    Batch: prData[item].BATCH,
                                    Plant: prData[item].PLANTCD,
                                    Purgrp: prData[item].PURGRP,
                                    Reqsnr: prData[item].REQSTNR,
                                    DesVendor: prData[item].VENDOR,
                                    PurchOrg: prData[item].PURORG,
                                    Trackingno: prData[item].TRCKNO,
                                    Supplytyp: prData[item].SUPTYP,
                                    InfoRec: prData[item].INFORECORD,
                                    Shiptoplant: prData[item].SHIPTOPLANT,
                                    Seasoncd: prData[item].SEASONCD,
                                    // ShortText: vData[0].GMCDESCEN,
                                    Callbapi: 'X'
                                })
                            }
                        }
                        
                        if(prCreateSetParam.length > 0){
                            prCreateSetParamSet['N_ChangePRParam'] = prCreateSetParam;
                            prCreateSetParamSet['N_ChangePRReturn'] = [];
                            await new Promise((resolve, reject)=>{
                                rfcModel.create("/ChangePRSet", prCreateSetParamSet, {
                                    method: "POST",
                                    success: function(oResultCPR, oResponse) {
                                        var oRetMsg = oResultCPR.N_ChangePRReturn.results.filter(fItem => fItem.PreqNo === poDetData.PRNO )//&& fItem.PreqItem === aData.at(item).PRITM);
            
                                        if (oRetMsg.length > 0) {
                                            if (oRetMsg[0].Type === 'S') {
                                                prCreated = true;
                                            }else{
                                                bError = true;
                                            }
                                        }
                                        resolve();
                                    },
                                    error: function(err) {
                                        bError = true;
                                        resolve();
                                    }
                                })
                            });

                            if(bError){
                                message = "Change Material: Error Encountered in PR Creation!"
                            }

                            if(prCreated){
                                //insert PO Line Item
                                var poDtlsSet = this.getView().getModel("VPODtlsVPODet").getProperty('/results');  
                                var poItemArr = [];
                                var poItemLastCnt = 0;

                                for(var x = 0; x < poDtlsSet.length; x++){
                                    poItemArr.push(poDtlsSet[x].ITEM);
                                }

                                poItemArr.sort(function(a, b){return b - a});
                                poItemLastCnt = poItemArr[0];

                                poItemLastCnt = String(parseInt(poItemLastCnt) + 10);

                                if(poItemLastCnt != "" || poItemLastCnt != null){
                                    while(poItemLastCnt.length < 5) poItemLastCnt = "0" + poItemLastCnt.toString();
                                    
                                }

                                oParamInitParam = {
                                    IPoNumber: me._pono,
                                    IDoDownload: "N",
                                    IChangeonlyHdrplants: "N",
                                }
                                for(var item in prData){
                                    if(poDetData.PRNO === prData[item].PRNO && poDetData.PRITM === prData[item].PRITM){
                                        oParamDataPO.push({
                                            Bedat     : sapDateFormat.format(new Date(topHeaderData.PODT)) + "T00:00:00", //PODocDt
                                            Bsart     : topHeaderData.DOCTYPE, //PODocTyp
                                            Banfn     : poDetData.PRNO, //PR
                                            Bnfpo     : prItemIncrement, //PRITM
                                            Ebeln     : poNo, //PONO
                                            Ebelp     : poItemLastCnt, //POITM
                                            Unsez     : shipToPlant, //shipToPlant
                                            Inco1     : incoTerms, // Incoterms
                                            Inco2     : destination, //Destination
                                            Evers     : shipMode, //ShipMode
                                            Bukrs     : topHeaderData.COMPANY,//COCD
                                            Werks     : topHeaderData.PURCHPLANT,//PLANTCD
                                            Unsez     : topHeaderData.SHIPTOPLANT,//
                                            Matnr     : vData[0].MATNO, //MatNo
                                            Charg     : poDetData.BATCH,
                                            Txz01     : poDetData.SHORTTEXT,//ShortText
                                            Menge     : vData[0].REQDQTY,//OrdQTY
                                            Meins     : vData[0].BASEUOM,//UOM
                                            Netpr     : poDetData.NETPRICE,//net price
                                            Repos     : poDetData.INVRCPTIND, //aData.at(item).INVRCPTIND, //IR Indicator
                                            Webre     : poDetData.GRBASEDIVIND, //aData.at(item).GRBASEDIVIND, //GR Based Ind
                                            Eindt     : sapDateFormat.format(new Date(poDetData.DELDT)) + "T00:00:00", //DlvDt
                                            Uebtk     : poDetData.UNLIMITED,//Unlimited
                                            Uebto     : poDetData.OVERDELTOL,//OverDel Tol.
                                            Untto     : poDetData.UNDERDELTOL,//UnderDel Tol.
                                            Zzmakt    : poDetData.POADDTLDESC, //PO Addtl Desc
                                        });
                                        
                                        //Tag PR as Close if PRQty = POQty
                                        oParamDataPOClose.push({
                                            Banfn: poDetData.PRNO, //PRNO
                                            Bnfpo: prItemIncrement, //PRITM
                                            Ebakz: "" 
                                        });
                                    }
                                }
                                if (oParamDataPO.length > 0) {
                                    oParam = oParamInitParam;
                                    oParam['N_ChangePOItemParam'] = oParamDataPO;
                                    oParam['N_ChangePOClosePRParam'] = oParamDataPOClose;
                                    oParam['N_ChangePOReturn'] = [];

                                    await new Promise((resolve, reject)=>{
                                        rfcModel.create("/ChangePOSet", oParam, {
                                            method: "POST",
                                            success: async function(oData, oResponse){
                                                if(oData.N_ChangePOReturn.results.length > 0){
                                                    if(oData.N_ChangePOReturn.results[0].Msgtyp === "E"){
                                                        bError = true;
                                                    }else{
                                                        poCreated = true;
                                                    }
                                                    resolve();
                                                }else{
                                                    bError = true;
                                                    resolve()
                                                }
                                            },error: function(error){
                                                //error message
                                                bError = true;
                                                resolve()
                                            }
                                        })
                                    });
                                }

                                if(bError){
                                    message = "Change Material: Error Encountered in PO Creation!"
                                }
                            }
                        }

                        //Tag Selected PO as Deleted
                        if(poCreated){
                            oParamInitParam = {}
                            oParamDataPO = [];
                            oParamDataPOClose = [];
                            oParam = {};
                            oParamInitParam = {
                                IPoNumber: me._pono,
                                IDoDownload: "N",
                                IChangeonlyHdrplants: "N",
                            }
                            oParamDataPO.push({
                                Banfn: poDetData.PRNO, //PRNO
                                Bnfpo: poDetData.PRITM, //PRITM
                                Ebeln: me._pono,//pono
                                Unsez: shipToPlant, //shipToPlant
                                Inco1: incoTerms, // Incoterms
                                Inco2: destination, //Destination
                                Evers: shipMode, //ShipMode
                                Ebelp: poDetData.ITEM,//poitem
                                Txz01: poDetData.SHORTTEXT,//shorttext
                                Menge: poDetData.POQTY,//QTY
                                Meins: poDetData.UOM,//UOM
                                Netpr: poDetData.NETPRICE,//net price
                                Peinh: poDetData.PER,//PER
                                Bprme: poDetData.ORDERPRICEUOM, //Order Price Unit
                                Repos: poDetData.INVRCPTIND, //IR Indicator
                                Webre: poDetData.GRBASEDIVIND, //GR Based Ind
                                Eindt: sapDateFormat.format(new Date(poDetData.DELDT)) + "T00:00:00", //DlvDt
                                Uebtk: poDetData.UNLIMITED,//Unlimited
                                Uebto: poDetData.OVERDELTOL,//OverDel Tol.
                                Untto: poDetData.UNDERDELTOL,//UnderDel Tol.
                                Zzmakt: poDetData.POADDTLDESC, //PO Addtl Desc
                                DeleteRec: true//Delete
                                
                            });
                            oParamDataPOClose.push({
                                Banfn: poDetData.PRNO, //PRNO
                                Bnfpo: poDetData.PRITM, //PRITM
                                Ebakz: "" 
                            })

                            if (oParamDataPO.length > 0) {
                                oParam = oParamInitParam;
                                oParam['N_ChangePOItemParam'] = oParamDataPO;
                                oParam['N_ChangePOClosePRParam'] = oParamDataPOClose;
                                oParam['N_ChangePOReturn'] = [];
                                console.log(oParam);

                                await new Promise((resolve, reject)=>{
                                    rfcModel.create("/ChangePOSet", oParam, {
                                        method: "POST",
                                        success: async function(oData, oResponse){
                                            if(oData.N_ChangePOReturn.results.length > 0){
                                                if(oData.N_ChangePOReturn.results[0].Msgtyp === 'E'){
                                                    bError = true;
                                                }
                                            }else{
                                                bError = true;
                                            }
                                            resolve();
                                        },error: function(error){
                                            bError = true;
                                        }
                                    })
                                });
                            }
                        }

                        if(bError){
                            message = "Change Material: Error Encountered!"
                        }else{
                            message = "Material Successfuly Changed!"
                        }

                        if(message !== undefined || message !== "" || message !== null){
                            if(bError){
                                MessageBox.error(message);
                            }else{
                                MessageBox.information(message);
                                me.changeMaterialDialog.destroy(true);
                                await me.loadAllData();
                            }
                        }

                        //Update ZERP_MRPDATA SET MRP = 3
                        //Close Dialog
                    }
                    Common.closeLoadingDialog(me);
                }
            },

            onCancelChangeMaterial: async function(){
                this.changeMaterialDialog.destroy(true);
            },
            
            onExportToExcel: Utils.onExport,

            onTableResize: function (oEvent){
                var event = oEvent.getSource();
                var oSplitter = this.byId("splitDet");
                var oFirstPane = oSplitter.getRootPaneContainer().getPanes().at(0);
                var oSecondPane = oSplitter.getRootPaneContainer().getPanes().at(1);
                if(this._tableFullScreenRender === ""){
                    if(event.getParent().getParent().getId().includes("mainTab")){
                        this.byId('vpoDetailTab').setVisible(false)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "100%",
                            resizable: false
                        });
                        oFirstPane.setLayoutData(oLayoutData);

                        this.byId('vpoBtnFullScreenDetails').setVisible(false)
                        this.byId('vpoBtnExitFullScreenDetails').setVisible(true)

                        this.byId("_IDGenVBox1").addStyleClass("onAddvboxHeight")
                    }
                    else if(event.getParent().getParent().getId().includes("vpoDetailsTab")){
                        this.byId('idIconTabBarInlineMode').setVisible(false)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "100%",
                            resizable: false
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").addStyleClass("onAddvboxHeight")
                        this.byId("vpoDetailTab").removeStyleClass("vpoDetSection")
                        this.byId("vpoDetailTab").addStyleClass("addDesignSection2")

                        this.byId('vpoBtnFullScreenDetails').setVisible(false)
                        this.byId('vpoBtnExitFullScreenDetails').setVisible(true)

                        // this.byId("vpoDetailsIconTab").setEnabled(false);
                        this.byId("vpoDelSchedIconTab").setEnabled(false);
                        this.byId("vpoDelInvIconTab").setEnabled(false);
                        this.byId("vpoPoHistIconTab").setEnabled(false);
                        this.byId("vpoConditionsIconTab").setEnabled(false);
                        this.byId("vpoProcFlowIconTab").setEnabled(false);
                        this.byId("vpoReceiptsIssuancesIconTab").setEnabled(false);
                    }
                    else if(event.getParent().getParent().getId().includes("vpoDelSchedTab")){
                        this.byId('idIconTabBarInlineMode').setVisible(false)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "100%",
                            resizable: false
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").addStyleClass("onAddvboxHeight")
                        this.byId("vpoDetailTab").removeStyleClass("vpoDetSection")
                        this.byId("vpoDetailTab").addStyleClass("addDesignSection2")

                        this.byId('vpoBtnFullScreenDelSched').setVisible(false)
                        this.byId('vpoBtnExitFullScreenDelSched').setVisible(true)

                        this.byId("vpoDetailsIconTab").setEnabled(false);
                        // this.byId("vpoDelSchedIconTab").setEnabled(false);
                        this.byId("vpoDelInvIconTab").setEnabled(false);
                        this.byId("vpoPoHistIconTab").setEnabled(false);
                        this.byId("vpoConditionsIconTab").setEnabled(false);
                        this.byId("vpoProcFlowIconTab").setEnabled(false);
                        this.byId("vpoReceiptsIssuancesIconTab").setEnabled(false);
                    }
                    else if(event.getParent().getParent().getId().includes("vpoDelInvTab")){
                        this.byId('idIconTabBarInlineMode').setVisible(false)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "100%",
                            resizable: false
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").addStyleClass("onAddvboxHeight")
                        this.byId("vpoDetailTab").removeStyleClass("vpoDetSection")
                        this.byId("vpoDetailTab").addStyleClass("addDesignSection2")

                        this.byId('vpoBtnFullScreenDelInv').setVisible(false)
                        this.byId('vpoBtnExitFullScreenDelInv').setVisible(true)

                        this.byId("vpoDetailsIconTab").setEnabled(false);
                        this.byId("vpoDelSchedIconTab").setEnabled(false);
                        // this.byId("vpoDelInvIconTab").setEnabled(false);
                        this.byId("vpoPoHistIconTab").setEnabled(false);
                        this.byId("vpoConditionsIconTab").setEnabled(false);
                        this.byId("vpoProcFlowIconTab").setEnabled(false);
                        this.byId("vpoReceiptsIssuancesIconTab").setEnabled(false);
                    }
                    else if(event.getParent().getParent().getId().includes("vpoPoHistTab")){
                        this.byId('idIconTabBarInlineMode').setVisible(false)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "100%",
                            resizable: false
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").addStyleClass("onAddvboxHeight")
                        this.byId("vpoDetailTab").removeStyleClass("vpoDetSection")
                        this.byId("vpoDetailTab").addStyleClass("addDesignSection2")

                        this.byId('vpoBtnFullScreenPOHistory').setVisible(false)
                        this.byId('vpoBtnExitFullScreenPOHistory').setVisible(true)

                        this.byId("vpoDetailsIconTab").setEnabled(false);
                        this.byId("vpoDelSchedIconTab").setEnabled(false);
                        this.byId("vpoDelInvIconTab").setEnabled(false);
                        // this.byId("vpoPoHistIconTab").setEnabled(false);
                        this.byId("vpoConditionsIconTab").setEnabled(false);
                        this.byId("vpoProcFlowIconTab").setEnabled(false);
                        this.byId("vpoReceiptsIssuancesIconTab").setEnabled(false);
                    }
                    else if(event.getParent().getParent().getId().includes("vpoConditionsTab")){
                        this.byId('idIconTabBarInlineMode').setVisible(false)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "100%",
                            resizable: false
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").addStyleClass("onAddvboxHeight")
                        this.byId("vpoDetailTab").removeStyleClass("vpoDetSection")
                        this.byId("vpoDetailTab").addStyleClass("addDesignSection2")

                        this.byId('vpoBtnFullScreenConditions').setVisible(false)
                        this.byId('vpoBtnExitFullScreenConditions').setVisible(true)

                        this.byId("vpoDetailsIconTab").setEnabled(false);
                        this.byId("vpoDelSchedIconTab").setEnabled(false);
                        this.byId("vpoDelInvIconTab").setEnabled(false);
                        this.byId("vpoPoHistIconTab").setEnabled(false);
                        // this.byId("vpoConditionsIconTab").setEnabled(false);
                        this.byId("vpoProcFlowIconTab").setEnabled(false);
                        this.byId("vpoReceiptsIssuancesIconTab").setEnabled(false);
                    }
                    else if(event.getParent().getParent().getId().includes("vpoProcFlowIconTab")){
                        this.byId('idIconTabBarInlineMode').setVisible(false)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "100%",
                            resizable: false
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").addStyleClass("onAddvboxHeight")
                        this.byId("vpoDetailTab").removeStyleClass("vpoDetSection")
                        this.byId("vpoDetailTab").addStyleClass("addDesignSection2")

                        this.byId('vpoBtnFullScreenProcFlow').setVisible(false)
                        this.byId('vpoBtnExitFullScreenProcFlow').setVisible(true)

                        this.byId("vpoDetailsIconTab").setEnabled(false);
                        this.byId("vpoDelSchedIconTab").setEnabled(false);
                        this.byId("vpoDelInvIconTab").setEnabled(false);
                        this.byId("vpoPoHistIconTab").setEnabled(false);
                        this.byId("vpoConditionsIconTab").setEnabled(false);
                        this.byId("vpoReceiptsIssuancesIconTab").setEnabled(false);
                    }
                    else if(event.getParent().getParent().getId().includes("vpoReceiptsIssuancesTab")){
                        this.byId('idIconTabBarInlineMode').setVisible(false)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "100%",
                            resizable: false
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").addStyleClass("onAddvboxHeight")
                        this.byId("vpoDetailTab").removeStyleClass("vpoDetSection")
                        this.byId("vpoDetailTab").addStyleClass("addDesignSection2")

                        this.byId('vpoBtnFullScreenReceiptsIssuancesTab').setVisible(false)
                        this.byId('vpoBtnExitFullScreenReceiptsIssuancesTab').setVisible(true)

                        this.byId("vpoDetailsIconTab").setEnabled(false);
                        this.byId("vpoDelSchedIconTab").setEnabled(false);
                        this.byId("vpoDelInvIconTab").setEnabled(false);
                        this.byId("vpoPoHistIconTab").setEnabled(false);
                        this.byId("vpoConditionsIconTab").setEnabled(false);
                        this.byId("vpoProcFlowIconTab").setEnabled(false);
                        // this.byId("vpoReceiptsIssuancesIconTab").setEnabled(false);
                    }
                    this._tableFullScreenRender = "Value"
                }
            },

            onExitTableResize: function(oEvent){
                var event = oEvent.getSource();
                var oSplitter = this.byId("splitDet");
                var oFirstPane = oSplitter.getRootPaneContainer().getPanes().at(0);
                var oSecondPane = oSplitter.getRootPaneContainer().getPanes().at(1);
                if(this._tableFullScreenRender !== ""){
                    if(event.getParent().getParent().getId().includes("mainTab")){
                        this.byId('vpoDetailTab').setVisible(true)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "46%",
                            resizable: true
                        });
                        oFirstPane.setLayoutData(oLayoutData);

                        this.byId('vpoBtnFullScreenDetails').setVisible(true)
                        this.byId('vpoBtnExitFullScreenDetails').setVisible(false)

                        this.byId("_IDGenVBox1").removeStyleClass("onAddvboxHeight")
                    }
                    else if(event.getParent().getParent().getId().includes("vpoDetailsTab")){
                        this.byId('idIconTabBarInlineMode').setVisible(true)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "50%",
                            resizable: true
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").removeStyleClass("onAddvboxHeight")
                        this.byId("vpoDetailTab").addStyleClass("vpoDetSection")
                        this.byId("vpoDetailTab").removeStyleClass("addDesignSection2")

                        this.byId('vpoBtnFullScreenDetails').setVisible(true)
                        this.byId('vpoBtnExitFullScreenDetails').setVisible(false)

                        this.byId("vpoDetailsIconTab").setEnabled(true);
                        this.byId("vpoDelSchedIconTab").setEnabled(true);
                        this.byId("vpoDelInvIconTab").setEnabled(true);
                        this.byId("vpoPoHistIconTab").setEnabled(true);
                        this.byId("vpoConditionsIconTab").setEnabled(true);
                        this.byId("vpoProcFlowIconTab").setEnabled(true);
                        this.byId("vpoReceiptsIssuancesIconTab").setEnabled(true);
                    }
                    else if(event.getParent().getParent().getId().includes("vpoDelSchedTab")){
                        this.byId('idIconTabBarInlineMode').setVisible(true)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "50%",
                            resizable: true
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").removeStyleClass("onAddvboxHeight")
                        this.byId("vpoDetailTab").addStyleClass("vpoDetSection")
                        this.byId("vpoDetailTab").removeStyleClass("addDesignSection2")

                        this.byId('vpoBtnFullScreenDelSched').setVisible(true)
                        this.byId('vpoBtnExitFullScreenDelSched').setVisible(false)

                        this.byId("vpoDetailsIconTab").setEnabled(true);
                        this.byId("vpoDelSchedIconTab").setEnabled(true);
                        this.byId("vpoDelInvIconTab").setEnabled(true);
                        this.byId("vpoPoHistIconTab").setEnabled(true);
                        this.byId("vpoConditionsIconTab").setEnabled(true);
                        this.byId("vpoProcFlowIconTab").setEnabled(true);
                        this.byId("vpoReceiptsIssuancesIconTab").setEnabled(true);
                    }
                    else if(event.getParent().getParent().getId().includes("vpoDelInvTab")){
                        this.byId('idIconTabBarInlineMode').setVisible(true)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "50%",
                            resizable: true
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").removeStyleClass("onAddvboxHeight")
                        this.byId("vpoDetailTab").addStyleClass("vpoDetSection")
                        this.byId("vpoDetailTab").removeStyleClass("addDesignSection2")

                        this.byId('vpoBtnFullScreenDelInv').setVisible(true)
                        this.byId('vpoBtnExitFullScreenDelInv').setVisible(false)

                        this.byId("vpoDetailsIconTab").setEnabled(true);
                        this.byId("vpoDelSchedIconTab").setEnabled(true);
                        this.byId("vpoDelInvIconTab").setEnabled(true);
                        this.byId("vpoPoHistIconTab").setEnabled(true);
                        this.byId("vpoConditionsIconTab").setEnabled(true);
                        this.byId("vpoProcFlowIconTab").setEnabled(true);
                        this.byId("vpoReceiptsIssuancesIconTab").setEnabled(true);
                    }
                    else if(event.getParent().getParent().getId().includes("vpoPoHistTab")){
                        this.byId('idIconTabBarInlineMode').setVisible(true)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "50%",
                            resizable: true
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").removeStyleClass("onAddvboxHeight")
                        this.byId("vpoDetailTab").addStyleClass("vpoDetSection")
                        this.byId("vpoDetailTab").removeStyleClass("addDesignSection2")

                        this.byId('vpoBtnFullScreenPOHistory').setVisible(true)
                        this.byId('vpoBtnExitFullScreenPOHistory').setVisible(false)

                        this.byId("vpoDetailsIconTab").setEnabled(true);
                        this.byId("vpoDelSchedIconTab").setEnabled(true);
                        this.byId("vpoDelInvIconTab").setEnabled(true);
                        this.byId("vpoPoHistIconTab").setEnabled(true);
                        this.byId("vpoConditionsIconTab").setEnabled(true);
                        this.byId("vpoProcFlowIconTab").setEnabled(true);
                        this.byId("vpoReceiptsIssuancesIconTab").setEnabled(true);
                    }
                    else if(event.getParent().getParent().getId().includes("vpoConditionsTab")){
                        this.byId('idIconTabBarInlineMode').setVisible(true)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "50%",
                            resizable: true
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").removeStyleClass("onAddvboxHeight")
                        this.byId("vpoDetailTab").addStyleClass("vpoDetSection")
                        this.byId("vpoDetailTab").removeStyleClass("addDesignSection2")

                        this.byId('vpoBtnFullScreenConditions').setVisible(true)
                        this.byId('vpoBtnExitFullScreenConditions').setVisible(false)

                        this.byId("vpoDetailsIconTab").setEnabled(true);
                        this.byId("vpoDelSchedIconTab").setEnabled(true);
                        this.byId("vpoDelInvIconTab").setEnabled(true);
                        this.byId("vpoPoHistIconTab").setEnabled(true);
                        this.byId("vpoConditionsIconTab").setEnabled(true);
                        this.byId("vpoProcFlowIconTab").setEnabled(true);
                        this.byId("vpoReceiptsIssuancesIconTab").setEnabled(true);
                    }
                    else if(event.getParent().getParent().getId().includes("vpoProcFlowIconTab")){
                        this.byId('idIconTabBarInlineMode').setVisible(true)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "50%",
                            resizable: true
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").removeStyleClass("onAddvboxHeight")
                        this.byId("vpoDetailTab").addStyleClass("vpoDetSection")
                        this.byId("vpoDetailTab").removeStyleClass("addDesignSection2")

                        this.byId('vpoBtnFullScreenProcFlow').setVisible(true)
                        this.byId('vpoBtnExitFullScreenProcFlow').setVisible(false)

                        this.byId("vpoDetailsIconTab").setEnabled(true);
                        this.byId("vpoDelSchedIconTab").setEnabled(true);
                        this.byId("vpoDelInvIconTab").setEnabled(true);
                        this.byId("vpoPoHistIconTab").setEnabled(true);
                        this.byId("vpoConditionsIconTab").setEnabled(true);
                        this.byId("vpoReceiptsIssuancesIconTab").setEnabled(true);
                    }
                    else if(event.getParent().getParent().getId().includes("vpoReceiptsIssuancesTab")){
                        this.byId('idIconTabBarInlineMode').setVisible(true)
                        var oLayoutData = new sap.ui.layout.SplitterLayoutData({
                            size: "50%",
                            resizable: true
                        });
                        oSecondPane.setLayoutData(oLayoutData);
                        this.byId("_IDGenVBox1").removeStyleClass("onAddvboxHeight")
                        this.byId("vpoDetailTab").addStyleClass("vpoDetSection")
                        this.byId("vpoDetailTab").removeStyleClass("addDesignSection2")

                        this.byId('vpoBtnFullScreenReceiptsIssuancesTab').setVisible(true)
                        this.byId('vpoBtnExitFullScreenReceiptsIssuancesTab').setVisible(false)

                        this.byId("vpoDetailsIconTab").setEnabled(true);
                        this.byId("vpoDelSchedIconTab").setEnabled(true);
                        this.byId("vpoDelInvIconTab").setEnabled(true);
                        this.byId("vpoPoHistIconTab").setEnabled(true);
                        this.byId("vpoConditionsIconTab").setEnabled(true);
                        this.byId("vpoProcFlowIconTab").setEnabled(true);
                        this.byId("vpoReceiptsIssuancesIconTab").setEnabled(true);
                    }
                    this._tableFullScreenRender = ""
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
                if(table == 'vpoChangeMatTbl'){
                    type = "VPOCHANGEMAT";
                    tabName = "ZDV_VPOCHMATNO";
                }
                if(table == 'vpoReceiptsIssuancesTab'){
                    type = "VPORECEIPTSISSUANCES";
                    tabName = "ZVB_VPO_RECISS";
                }
                    
                
                // saving of the layout of table
                var me = this;
                var ctr = 1;
                var oTable = this.getView().byId(table);
                var oColumns = oTable.getColumns();
                var vSBU = this._sbu;
    
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
                        sap.m.MessageBox.information(_captionList.INFO_LAYOUT_SAVE);
                        //Common.showMessage(me._i18n.getText('t6'));
                    },
                    error: function(err) {
                        //Layout Error
                        sap.m.MessageBox.error(_captionList.INFO_NO_LAYOUT);
                    }
                });
            },

            disableOtherTabs: function (tabName) {
                var oIconTabBar = this.byId(tabName);
                // this.byId("idChangesIconTabBar").setEnabled(false);
                oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                    .forEach(item => item.setProperty("enabled", false));
            },
            disableOtherTabsChild: function (tabName) {
                var oIconTabBar = this.byId(tabName);
                // this.byId("idChangesIconTabBar").setEnabled(false);
                oIconTabBar.getItems().filter(item => item.getProperty("key"))
                .forEach(item => item.setProperty("enabled", false));
            },
            enableOtherTabs: function (tabName) {
                var oIconTabBar = this.byId(tabName);
                // this.byId("idChangesIconTabBar").setEnabled(false);
                oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));
            },
            enableOtherTabsChild: function (tabName) {
                var oIconTabBar = this.byId(tabName);
                // this.byId("idChangesIconTabBar").setEnabled(false);
                oIconTabBar.getItems().filter(item => item.getProperty("key"))
                .forEach(item => item.setProperty("enabled", true));
            },

            getProcessFlow: function(poItem) {
                // this.getView().getModel("vpoProcessFlow").setProperty("/nodes", []);

                var oModel = this.getOwnerComponent().getModel();
                var me = this;
                var oGRData = [], oInvData = [];

                var bGetGRFin = false, bGetInvFin = false;

                oModel.read('/VPOProcFlowGRSet', { 
                    urlParameters: {
                        "$filter": "EBELN eq '" + this._pono + "' and EBELP eq '"+ poItem +"'"
                    },
                    success: function (oData, oResponse) {
                        oGRData = oData.results;
                        bGetGRFin = true;
                    },
                    error: function (err) { bGetGRFin = true; }
                });

                oModel.read('/VPOProcFlowINVSet', { 
                    urlParameters: {
                        "$filter": "EBELN eq '" + this._pono + "' and EBELP eq '"+ poItem +"'"
                    },
                    success: function (oData, oResponse) {
                        oInvData = oData.results;
                        bGetInvFin = true;
                    },
                    error: function (err) { bGetInvFin = true; }
                });

                var oInterval = setInterval(() => {
                    if (bGetGRFin && bGetInvFin) {
                        me.setProcessFlow(oGRData, oInvData, poItem);
                        clearInterval(oInterval);
                    }
                }, 100);
            },

            setProcessFlow: function(oGRData, oInvData, poItem) {
                this._processFlowData = [];

                var oPOItem = [];
                var oNodes = [];
                var iCounter = 0;
                var sVendor = this.getView().getModel("topHeaderData").getData().VENDOR;          

                this.byId("vpoDetailsTab").getModel().getData().rows.forEach(item => {  
                    iCounter++;
                    var oChildren = [];
                    var oGRItemData = oGRData.filter(fItem => fItem.EBELP === item.ITEM && fItem.EBELN === item.PONO);
                    var oInvItemData = oInvData.filter(fItem => fItem.EBELP === item.ITEM && fItem.EBELN === item.PONO);
                    

                    oGRItemData.forEach((gr, idx) => oChildren.push(idx+1+iCounter));
                    oInvItemData.forEach((inv, idx) => oChildren.push(idx+1+iCounter+oGRItemData.length));

                    if(item.ITEM === poItem){
                        oNodes.push({
                            id: iCounter + "",
                            lane: "0",
                            title: "Purchase Order " + item.PONO + "/" + poItem,
                            titleAbbreviation: "PO",
                            children: oChildren,
                            state: "Positive",
                            stateText: "Follow-On Documents",
                            focused: true,
                            highlighted: false,
                            texts: [ "Created On: " + dateFormat.format(new Date(item.CREATEDDT)), "Vendor: " + sVendor ]                        
                        })
                    }
                    
                    
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
                
                this.getView().getModel("vpoProcessFlow").setProperty("/nodes", oNodes);
                this.byId("vpoProcessFlowPO").setZoomLevel("One")
                this.getView().setModel(new JSONModel(oPOItem), "poitem");
            },

            onNodePress: function(oEvent) {
                var oData = this._processFlowData.filter(fItem => fItem.NODEID === oEvent.getParameters().getNodeId());
                this.viewDoc(oData[0].ITEM); 
            },

            viewDoc: function(oData) {
                var vSBU = this._sbu;
                var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

                if (oData.DOCTYPE === "MAT") {
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
                    var hash = "ZSO_3DERP_PUR_PR-display&/PRDetail/" + vSBU + "/" + oData.PRNO + "/" + oData.PRITEM;
                }
                // else if (oData.DOCTYPE === "PR") {
                //     var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
                //         target: {
                //             semanticObject: "ZSO_3DERP_PUR_PR",
                //             action: "display&/PRDetail/" + vSBU + "/" + oData.PRNO + "/" + oData.PRITEM
                //         }
                //     })) || ""; 
                // }

                oCrossAppNavigator.toExternal({
                    target: {
                        shellHash: hash
                    }
                });
            },

            navToIOMatList: function(oData){
                if(oData.STYLENO === "" || oData.STYLENO === undefined || oData.STYLENO === null){
                    return;
                }

                var vSBU = this._sbu;
                that._router.navTo("ioMaterialList", {
                    IONO: oData.IONO,
                    SBU: vSBU,
                    STYLENO:  oData.STYLENO
                });
            },

            handleValueHelp: function(oEvent) { 
                var oSource = oEvent.getSource();
                var oData = [];
                var sTitle = "";

                this._inputId = oSource.getId();
                this._inputValue = oSource.getValue();
                this._inputSource = oSource;

                if (this._inputId.indexOf("iptFilterPOItem") >= 0) {
                    oData = this.getView().getModel("poitem").getData();
                    oData.forEach(item => {
                        item.VHTitle = item.ITEM;
                        item.VHSelected = (item.UOM === this._inputValue);
                    })
                    sTitle = "Item";

                    oData.sort((a,b) => (a.VHTitle > b.VHTitle ? 1 : -1));
                }

                var oVHModel = new JSONModel({
                    items: oData,
                    title: sTitle,
                    multiSelect: true
                }); 
    
                // create value help dialog
                if (!this._valueHelpDialog) {
                    this._valueHelpDialog = sap.ui.xmlfragment(
                        "zuivendorpo.view.fragments.dialog.ValueHelpDialog",
                        this
                    );
                    
                    this._valueHelpDialog.setModel(oVHModel);
                    this.getView().addDependent(this._valueHelpDialog);
                }
                else {
                    this._valueHelpDialog.setModel(oVHModel);
                }                            
    
                this._valueHelpDialog.open();            
            },
    
            handleValueHelpClose : function (oEvent) {
                var me = this;

                if (oEvent.sId === "confirm") {
                    var aSelectedItems = oEvent.getParameter("selectedItems");

                    if (aSelectedItems) {
                        // this._inputSource.setValue(aSelectedItems.getTitle());

                        aSelectedItems.forEach(function (oItem) {
                            me._inputSource.addToken(new Token({
                                text: oItem.getTitle()
                            }));
                        });
                    }   
    
                    this._inputSource.setValueState("None");
                }
                else if (oEvent.sId === "cancel") {
    
                }
            },
    
            onValueHelpInputChange: function(oEvent) {
                var oSource = oEvent.getSource();
                var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
                oSource.setValueState(isInvalid ? "Error" : "None");
    
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
            },

            getResource: async (me) => {   
                var oModel = me.getOwnerComponent().getModel();

                var oParam = {
                    SBU: me._sbu,
                    PONO: me._pono,
                    N_PurchOrg: [],
                    N_PurchGrp: [],
                    N_PayTerms: [],
                    N_IncoTerms: [],
                    N_ShipMode: [],
                    N_UOM: [],
                    N_DocTypeInfo: [],
                    N_CustGrp: [],
                    N_Vendor: [],
                    N_InfoRecChk: [],
                    N_Company: [],
                    N_Currency: [],
                    N_PODocType: [],
                    N_PurchPlant: [],
                    N_ShipToPlant: [],
                    N_SupplyType: [],
                    N_Plant: []
                }
    
                var oPromise = new Promise((resolve, reject) => {
                    oModel.create("/VPOSplitPOResourceSet", oParam, {
                        method: "POST",
                        success: function(oData, oResponse) {
                            me.getView().setModel(new JSONModel(oData.N_PurchOrg.results), "purchorg");
                            me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/purchorg", oData.N_PurchOrg.results);

                            me.getView().setModel(new JSONModel(oData.N_PurchGrp.results), "purchgrp");
                            me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/purchgrp", oData.N_PurchGrp.results);

                            me.getView().setModel(new JSONModel(oData.N_PayTerms.results), "payterms");
                            me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/payterms", oData.N_PayTerms.results);

                            me.getView().setModel(new JSONModel(oData.N_IncoTerms.results), "incoterms");
                            me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/incoterms", oData.N_IncoTerms.results); 

                            me.getView().setModel(new JSONModel(oData.N_ShipMode.results), "shipmode");
                            me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/shipmode", oData.N_ShipMode.results);

                            me.getView().setModel(new JSONModel(oData.N_UOM.results), "uom");
                            me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/uom", oData.N_UOM.results);

                            me.getView().setModel(new JSONModel(oData.N_DocTypeInfo.results), "podoctypeinfo");
                            me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/podoctypeinfo", oData.N_DocTypeInfo.results);

                            me.getView().setModel(new JSONModel(oData.N_CustGrp.results), "custgrp");
                            me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/custgrp", oData.N_CustGrp.results);

                            me.getView().setModel(new JSONModel(oData.N_Vendor.results), "vendor");
                            me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/vendor", oData.N_Vendor.results);

                            me.getView().setModel(new JSONModel(oData.N_InfoRecChk.results), "inforecchk");
                            me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/inforecchk", oData.N_InfoRecChk.results);

                            me.getView().setModel(new JSONModel(oData.N_Company.results), "company");
                            me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/company", oData.N_Company.results);
    
                            me.getView().setModel(new JSONModel(oData.N_Currency.results), "currency");
                            me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/currency", oData.N_Currency.results);
    
                            me.getView().setModel(new JSONModel(oData.N_SupplyType.results), "supplytype");
                            me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/supplytype", oData.N_SupplyType.results);

                            me.getView().setModel(new JSONModel(oData.N_PODocType.results), "podoctype");
                            me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/podoctype", oData.N_PODocType.results);

                            me.getView().setModel(new JSONModel(oData.N_PurchPlant.results), "purchplant");
                            me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/purchplant", oData.N_PurchPlant.results);

                            me.getView().setModel(new JSONModel(oData.N_ShipToPlant.results), "shiptoplant");
                            me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/shiptoplant", oData.N_ShipToPlant.results);

                            me.getView().setModel(new JSONModel(oData.N_Plant.results), "plant");
                            me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/plant", oData.N_Plant.results);

                            resolve(true);
                        },
                        error: function (err) {
                            resolve(false);
                        }
                    });
                })
                
                return await oPromise;
            },

            //******************************************* */
            // Column Filtering
            //******************************************* */

            onColFilterClear: function(oEvent) {
                TableFilter.onColFilterClear(oEvent, this);
            },

            onColFilterCancel: function(oEvent) {
                TableFilter.onColFilterCancel(oEvent, this);
            },

            onColFilterConfirm: function(oEvent) {
                TableFilter.onColFilterConfirm(oEvent, this);
            },

            onFilterItemPress: function(oEvent) {
                TableFilter.onFilterItemPress(oEvent, this);
            },

            onFilterValuesSelectionChange: function(oEvent) {
                TableFilter.onFilterValuesSelectionChange(oEvent, this);
            },

            onSearchFilterValue: function(oEvent) {
                TableFilter.onSearchFilterValue(oEvent, this);
            },

            onCustomColFilterChange: function(oEvent) {
                TableFilter.onCustomColFilterChange(oEvent, this);
            },

            onSetUseColFilter: function(oEvent) {
                TableFilter.onSetUseColFilter(oEvent, this);
            },

            onRemoveColFilter: function(oEvent) {
                TableFilter.onRemoveColFilter(oEvent, this);
            },

            pad: Common.pad,


            //******************************************* */
            // Other Info
            //******************************************* */

            onInitOtherInfo() {
                this.getResourceOthInfo("OthInfoCurrencyRscSet", "othInfoCurrencyRsc");
                this.getResourceOthInfo("OthInfoUomRscSet", "othInfoUomRsc");

                this.getOthInfo();
            },

            getResourceOthInfo(pEntitySet, pModel) {
                var me = this;
                var oModel = me.getOwnerComponent().getModel();

                oModel.read("/" + pEntitySet, {
                    success: async function (oData, oResponse) {
                        me.getView().setModel(new JSONModel(oData.results), pModel);
                        me.getOwnerComponent().getModel("LOOKUP_MODEL").setProperty("/" + pModel, oData.results);
                    },
                    error: function () {
                    }
                })
            },

            getOthInfo() {
                var oModel = this.getOwnerComponent().getModel();
                var me = this;
                var sPONo = this._pono;

                oModel.read('/OthInfoSet', { 
                    urlParameters: {
                        "$filter": "EBELN eq '" + sPONo + "'"
                    },
                    success: function (data, response) {
                        console.log("getOthInfo", data);
                        if (data.results.length > 0) {
                            data.results.forEach(item => {
                                item.CREATEDDT = dateFormat.format(item.CREATEDDT) + " " + timeFormat.format(new Date(item.CREATEDTM.ms + TZOffsetMs));
                                item.UPDATEDDT = dateFormat.format(item.UPDATEDDT) + " " + timeFormat.format(new Date(item.UPDATEDTM.ms + TZOffsetMs));
                            })
                        }

                        var oJSONModel = new JSONModel();
                        oJSONModel.setData(data.results);
                        me.getView().setModel(oJSONModel, "othInfoData");
                        me.getView().getModel("ui").setProperty("/othInfoDataEdit", false);

                        if (data.results.length > 0) {
                            var oData = data.results[0];

                            me.byId("iptOthInfoPONo").setValue(oData.EBELN);
                            me.byId("iptOthInfoConsigneeName").setValue(oData.CNEENAME);
                            me.byId("iptOthInfoCompanyName").setValue(oData.COMPNAME);
                            me.byId("iptOthInfoCompanyAddr").setValue(oData.COMPADD);
                            me.byId("iptOthInfoTelNo").setValue(oData.TELF1);
                            me.byId("iptOthInfoFaxNo").setValue(oData.TELFX);
                            me.byId("iptOthInfoCurrency").setSelectedKey(oData.CURR);
                            me.byId("iptOthInfoFinContName").setValue(oData.FINNAME);
                            me.byId("iptOthInfoFinContNo").setValue(oData.FINTELF1);
                            me.byId("iptOthInfoWhseContName").setValue(oData.WHSNAME);
                            me.byId("iptOthInfoWhseContNo").setValue(oData.WHSTELF1);
                            me.byId("iptOthInfoWhseContAddr").setValue(oData.WHSADD);
                            me.byId("iptOthInfoDiscVat").setValue(oData.DISCVAT);
                            me.byId("iptOthInfoOrderUom").setSelectedKey(oData.ORDERUOM);
                            me.byId("iptOthInfoCreatedBy").setValue(oData.CREATEDBY);
                            me.byId("iptOthInfoCreatedDt").setValue(oData.CREATEDDT);
                        }
                        else {
                            me.byId("iptOthInfoPONo").setValue("");
                            me.byId("iptOthInfoConsigneeName").setValue("");
                            me.byId("iptOthInfoCompanyName").setValue("");
                            me.byId("iptOthInfoCompanyAddr").setValue("");
                            me.byId("iptOthInfoTelNo").setValue("");
                            me.byId("iptOthInfoFaxNo").setValue("");
                            me.byId("iptOthInfoCurrency").setValue("");
                            me.byId("iptOthInfoFinContName").setValue("");
                            me.byId("iptOthInfoFinContNo").setValue("");
                            me.byId("iptOthInfoWhseContName").setValue("");
                            me.byId("iptOthInfoWhseContNo").setValue("");
                            me.byId("iptOthInfoWhseContAddr").setValue("");
                            me.byId("iptOthInfoDiscVat").setValue("");
                            me.byId("iptOthInfoOrderUom").setValue("");
                            me.byId("iptOthInfoCreatedBy").setValue("");
                            me.byId("iptOthInfoCreatedDt").setValue("");
                        }
                    },
                    error: function (err) {
                    }
                });
            },

            onAddManualOthInfo() {
                var me = this;
                var bProceed = true;
                bProceed = me.validatePOOthInfo();

                if (me.byId("iptOthInfoPONo").getValue().length > 0) {
                    MessageBox.information(_captionList.WARN_ADD_NOT_ALLOW);
                    return;
                }

                if(bProceed) {
                    this.getView().getModel("ui").setProperty("/othInfoDataEdit", true);    
                
                    this.byId("mbAddOthInfo").setVisible(false);
                    this.byId("btnEditOthInfo").setVisible(false);
                    this.byId("btnSaveOthInfo").setVisible(true);
                    this.byId("btnCancelOthInfo").setVisible(true);
                    this.byId("btnDeleteOthInfo").setVisible(false);
                    this.byId("btnRefreshOthInfo").setVisible(false);

                    this.disableOtherTabs("idIconTabBarInlineMode");
                    this.disableOtherTabs("vpoDetailTab");

                    this._othInfoDataTemp = jQuery.extend(true, {}, this.getView().getModel("othInfoData").getData());
                }
            },

            onAddCopyDefaultOthInfo() {
                var me = this;
                var bProceed = true;
                bProceed = me.validatePOOthInfo();

                if (me.byId("iptOthInfoPONo").getValue().length > 0) {
                    MessageBox.information(_captionList.WARN_ADD_NOT_ALLOW);
                    return;
                }

                if(bProceed) {
                    MessageBox.confirm(_captionList.CONFIRM_PROCEED_COPYDEFAULT, {
                        actions: ["Yes", "No"],
                        onClose: function (sAction) {
                            if (sAction == "Yes") {
                                var oParam = {
                                    EBELN: me._pono,
                                    CNEENAME: "COPY_DEFAULT",
                                    COMPNAME: null,
                                    COMPADD: null,
                                    TELF1: null,
                                    TELFX: null,
                                    CURR: null,
                                    FINNAME: null,
                                    FINTELF1: null,
                                    WHSNAME: null,
                                    WHSTELF1: null,
                                    WHSADD: null,
                                    DISCVAT: null,
                                    ORDERUOM: null
                                }
            
                                var oModel = me.getOwnerComponent().getModel();
                                oModel.create("/OthInfoSet", oParam, {
                                    method: "POST",
                                    success: function(data, oResponse) {
                                        console.log("success", oResponse)
                                        me.getOthInfo();
                                    },
                                    error: function(err) {
                                        console.log("error", err);
                                    }
                                });
                            }
                        }
                    });
                }
            },

            onEditOthInfo() {
                var me = this;
                var bProceed = true;
                bProceed = me.validatePOOthInfo();

                if (me.byId("iptOthInfoPONo").getValue().length == 0) {
                    MessageBox.information(_captionList.WARN_EDIT_NOT_ALLOW);
                    return;
                }

                if(bProceed) {
                    this.getView().getModel("ui").setProperty("/othInfoDataEdit", true);    
                
                    this.byId("mbAddOthInfo").setVisible(false);
                    this.byId("btnEditOthInfo").setVisible(false);
                    this.byId("btnSaveOthInfo").setVisible(true);
                    this.byId("btnCancelOthInfo").setVisible(true);
                    this.byId("btnDeleteOthInfo").setVisible(false);
                    this.byId("btnRefreshOthInfo").setVisible(false);

                    this.disableOtherTabs("idIconTabBarInlineMode");
                    this.disableOtherTabs("vpoDetailTab");

                    this._othInfoDataTemp = jQuery.extend(true, {}, this.getView().getModel("othInfoData").getData());
                }
            },

            onSaveOthInfo() {
                var me = this;
                var oParam = {
                    EBELN: me._pono,
                    CNEENAME: (me.byId("iptOthInfoConsigneeName").getValue() ? me.byId("iptOthInfoConsigneeName").getValue() : null),
                    COMPNAME: (me.byId("iptOthInfoCompanyName").getValue() ? me.byId("iptOthInfoCompanyName").getValue() : null),
                    COMPADD: (me.byId("iptOthInfoCompanyAddr").getValue() ? me.byId("iptOthInfoCompanyAddr").getValue() : null),
                    TELF1: (me.byId("iptOthInfoTelNo").getValue() ? me.byId("iptOthInfoTelNo").getValue() : null),
                    TELFX: (me.byId("iptOthInfoFaxNo").getValue() ? me.byId("iptOthInfoFaxNo").getValue() : null),
                    CURR: (me.byId("iptOthInfoCurrency").getSelectedKey() ? me.byId("iptOthInfoCurrency").getSelectedKey() : null),
                    FINNAME: (me.byId("iptOthInfoFinContName").getValue() ? me.byId("iptOthInfoFinContName").getValue() : null),
                    FINTELF1: (me.byId("iptOthInfoFinContNo").getValue() ? me.byId("iptOthInfoFinContNo").getValue() : null),
                    WHSNAME: (me.byId("iptOthInfoWhseContName").getValue() ? me.byId("iptOthInfoWhseContName").getValue() : null),
                    WHSTELF1: (me.byId("iptOthInfoWhseContNo").getValue() ? me.byId("iptOthInfoWhseContNo").getValue() : null),
                    WHSADD: (me.byId("iptOthInfoWhseContAddr").getValue() ? me.byId("iptOthInfoWhseContAddr").getValue() : null),
                    DISCVAT: (me.byId("iptOthInfoDiscVat").getValue() ? me.byId("iptOthInfoDiscVat").getValue() : "0"),
                    ORDERUOM: (me.byId("iptOthInfoOrderUom").getSelectedKey() ? me.byId("iptOthInfoOrderUom").getSelectedKey() : null)
                }

                var oModel = me.getOwnerComponent().getModel();
                if (me.byId("iptOthInfoPONo").getValue() == "") {
                    oModel.create("/OthInfoSet", oParam, {
                        method: "POST",
                        success: function(data, oResponse) {
                            console.log("success", oResponse)
                            
                            me.getOthInfo();

                            me.byId("mbAddOthInfo").setVisible(true);
                            me.byId("btnEditOthInfo").setVisible(true);
                            me.byId("btnSaveOthInfo").setVisible(false);
                            me.byId("btnCancelOthInfo").setVisible(false);
                            me.byId("btnDeleteOthInfo").setVisible(true);
                            me.byId("btnRefreshOthInfo").setVisible(true);

                            me.enableOtherTabs("idIconTabBarInlineMode");
                            me.enableOtherTabs("vpoDetailTab");
                        },
                        error: function(err) {
                            console.log("error", err)
                            var oError = JSON.parse(err.responseText);
                            var sError = oError.error.message.value;

                            sError = sError.replace("Property", "Column");
                            sError = sError.replace("at offset '20'", "");

                            MessageBox.error(sError);
                        }
                    });
                }
                else {
                    oModel.update("/OthInfoSet(EBELN='" + oParam.EBELN + "')", oParam, {
                        method: "PUT",
                        success: function(data, oResponse) {
                            console.log("success", oResponse)
                            
                            me.getOthInfo();

                            me.byId("mbAddOthInfo").setVisible(true);
                            me.byId("btnEditOthInfo").setVisible(true);
                            me.byId("btnSaveOthInfo").setVisible(false);
                            me.byId("btnCancelOthInfo").setVisible(false);
                            me.byId("btnDeleteOthInfo").setVisible(true);
                            me.byId("btnRefreshOthInfo").setVisible(true);

                            me.enableOtherTabs("idIconTabBarInlineMode");
                            me.enableOtherTabs("vpoDetailTab");
                        },
                        error: function(err) {
                            console.log("error", err);
                        }
                    });
                }
            },

            onCancelOthInfo() {
                var me = this;

                MessageBox.confirm(_captionList.CONF_DISCARD_CHANGE, {
                    actions: ["Yes", "No"],
                    onClose: function (sAction) {
                        if (sAction == "Yes") {
                            me.getOthInfo();

                            me.byId("mbAddOthInfo").setVisible(true);
                            me.byId("btnEditOthInfo").setVisible(true);
                            me.byId("btnSaveOthInfo").setVisible(false);
                            me.byId("btnCancelOthInfo").setVisible(false);
                            me.byId("btnDeleteOthInfo").setVisible(true);
                            me.byId("btnRefreshOthInfo").setVisible(true);

                            me.enableOtherTabs("idIconTabBarInlineMode");
                            me.enableOtherTabs("vpoDetailTab");
                        }
                    }
                });
            },

            onDeleteOthInfo() {
                var me = this;
                var bProceed = true;
                bProceed = me.validatePOOthInfo();

                if (me.byId("iptOthInfoPONo").getValue().length == 0) {
                    MessageBox.information(_captionList.WARN_DELETE_NOT_ALLOW);
                    return;
                }

                if(bProceed) {
                    MessageBox.confirm(_captionList.INFO_PROCEED_DELETE, {
                        actions: ["Yes", "No"],
                        onClose: function (sAction) {
                            if (sAction === "Yes") {
                                var oModel = me.getOwnerComponent().getModel();
                                oModel.remove("/OthInfoSet(EBELN='" + me._pono + "')", {
                                    method: "DELETE",
                                    success: function(data, oResponse) {
                                        console.log("success", oResponse)
                                        me.getOthInfo();
                                    },
                                    error: function(err) {
                                        console.log("error", err);
                                    }
                                });                      
                            }
                        }
                    });
                }
            },

            onRefreshOthInfo() {
                this.getOthInfo();
            },

            validatePOOthInfo() {
                var me = this;
                var bProceed = true
                var isValid = true

                var count = me.getView().getModel("VPODtlsVPODet").getProperty("/results").length;
                var itemCount = 0;
                var isValidObj = [];
                
                this.getView().getModel("VPODtlsVPODet").getProperty("/results").forEach(item => {

                    if (item.DELETED === true || item.CLOSED === true){
                        isValidObj.push({
                            Deleted: item.DELETED,
                            Closed: item.CLOSED
                        });
                        itemCount++
                    }
                    else {
                        isValidObj.push({
                            Deleted: item.DELETED,
                            Closed: item.CLOSED
                        })
                        itemCount++
                    }

                    if(itemCount === count){
                        var result = isValidObj.find(item => item.Deleted === false && item.Closed === false)
                        if(result != undefined){
                            if (result.Deleted === false && result.Closed === false){
                                bProceed = true;
                            }
                            else{
                                bProceed = false;
                            }
                        }
                        else{
                            bProceed = false;
                        }
                    }
                })

                if(!isValid){
                    MessageBox.error(_captionList.INFO_PO_IS_DELETED)
                    return false;
                }

                if(!bProceed){
                    MessageBox.error(_captionList.INFO_PO_CLOSED_DELETED)
                    return false;
                }

                return true;
            }

        });
    });
