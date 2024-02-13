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
        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "MM/dd/yyyy" });

        var timeFormat = sap.ui.core.format.DateFormat.getTimeInstance({ pattern: "KK:mm:ss a" });
        var TZOffsetMs = new Date(0).getTimezoneOffset() * 60 * 1000;

        var _captionList = [];
        var that;

        return Controller.extend("zuivendorpo.controller.ioMaterialList", {
            onInit: function(){
                that = this;
                var _oComponent = this.getOwnerComponent();
                this._router = _oComponent.getRouter();
                
                this._router.getRoute("ioMaterialList").attachPatternMatched(this._routePatternMatched, this);

                this._ioNo = "";
                this._sbu = "";
                this._styleNo = "";

                console.log("Test")

                //Column Properties Variables
                this._columnLoadError = false;
            },
            _routePatternMatched: async function (oEvent) {
                this._ioNo = oEvent.getParameter("arguments").IONO;
                this._sbu = oEvent.getParameter("arguments").SBU;
                this._styleNo = oEvent.getParameter("arguments").STYLENO;
                
                await this.callCaptionsAPI();
                Common.openLoadingDialog(that);
                await this.getHeaderData();

                //Load Columns
                await this.getDynamicColumns("IOMATLIST", "ZDV_3DERP_MATLST");
                Common.closeLoadingDialog(that);
            },

            getHeaderData: async function(){
                var me = this;
                var vIONo = this._ioNo;
                var oModelIO = this.getOwnerComponent().getModel("ZGW_3DERP_IO_SRV");
                var oJSONModel = new JSONModel();
                var oView = this.getView();
                var entitySet = "/IOHDRSet('" + vIONo + "')";

                await new Promise((resolve, reject) => {
                    oModelIO.read(entitySet, {
                        success: async function (oData, oResponse) {
                            oData.CUSTDLVDT = oData.CUSTDLVDT === "0000-00-00" || oData.CUSTDLVDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.CUSTDLVDT));
                            oData.REVCUSTDLVDT = oData.REVCUSTDLVDT === "0000-00-00" || oData.REVCUSTDLVDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.REVCUSTDLVDT));
                            oData.REQEXFTYDT = oData.REQEXFTYDT === "0000-00-00" || oData.REQEXFTYDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.REQEXFTYDT));
                            oData.PRODSTART = oData.PRODSTART === "0000-00-00" || oData.PRODSTART === "    -  -  " ? "" : dateFormat.format(new Date(oData.PRODSTART));
                            oData.MATETA = oData.MATETA === "0000-00-00" || oData.MATETA === "    -  -  " ? "" : dateFormat.format(new Date(oData.MATETA));
                            oData.MAINMATETA = oData.MAINMATETA === "0000-00-00" || oData.MAINMATETA === "    -  -  " ? "" : dateFormat.format(new Date(oData.MAINMATETA));
                            oData.SUBMATETA = oData.SUBMATETA === "0000-00-00" || oData.SUBMATETA === "    -  -  " ? "" : dateFormat.format(new Date(oData.SUBMATETA));
                            oData.CUTMATETA = oData.CUTMATETA === "0000-00-00" || oData.CUTMATETA === "    -  -  " ? "" : dateFormat.format(new Date(oData.CUTMATETA));
                            oData.PLANDLVDT = oData.PLANDLVDT === "0000-00-00" || oData.PLANDLVDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.PLANDLVDT));
                            oData.CREATEDDT = oData.CREATEDDT === "0000-00-00" || oData.CREATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.CREATEDDT));
                            oData.UPDATEDDT = oData.UPDATEDDT === "0000-00-00" || oData.UPDATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.UPDATEDDT));

                            console.log(oData);

                            oJSONModel.setData(oData);
                            oView.setModel(oJSONModel, "headerData");
                            await me.getIOMatList();
                            resolve();
                        },
                        error: function () {
                            resolve();
                        }
                    });
                });
            },

            getIOMatList: async function(){
                var vIONo = this._ioNo;
                var oModelIOMatList = this.getOwnerComponent().getModel("ZGW_3DERP_IOMATLIST_SRV");
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                await new Promise((resolve, reject) => {
                    oModelIOMatList.read('/MainSet', {
                        urlParameters: {
                            "$filter": "IONO eq '" + vIONo + "'"
                        },
                        success: function (oData, oResponse) {
                            oData.results.sort((a, b) => (a.SEQNO > b.SEQNO ? 1 : -1));

                            oData.results.forEach((row, index) => {
                                row.ACTIVE = index === 0 ? "X" : "";
                                row.POQTY = row.POQTY + "";
                                row.INDCQTY = row.INDCQTY + "";
                                row.ISSTOPROD = row.ISSTOPROD + "";
                                row.MITQTY = row.MITQTY + "";
                                row.MRPQTY = row.MRPQTY + "";
                                row.MRTRANSFERQTY = row.MRTRANSFERQTY + "";
                                row.PLANTAVAILQTY = row.PLANTAVAILQTY + "";
                                row.PRQTY = row.PRQTY + "";
                                row.VARIANCE = row.VARIANCE + "";
                                row.DELETED = row.DELETED === "X" ? true : false;
                                row.REQMATNO = row.REQMATNO === "X" ? true : false;
                            });
                            console.log(oData);

                            oJSONModel.setData(oData);
                            oView.setModel(oJSONModel, "IOMatlistData");
                            resolve();
                        },
                        error: function () {
                            resolve();
                        }
                    });
                });
            },

            getDynamicColumns: async function(model, dataSource){
                var me = this;
                var modCode = model;
                var tabName = dataSource;
                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new JSONModel();
                //var vSBU = this.getView().getModel("ui").getData().sbu;
                var vSBU = this._sbu;
                console.log("check")
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                oModel.setHeaders({
                    sbu: vSBU,
                    type: modCode,
                    tabname: tabName
                });
                await new Promise((resolve, reject) => {
                    oModel.read("/ColumnsSet", {
                        success: async function (oData, oResponse) {
                            console.log(oData);
                            if (oData.results.length > 0) {
                                console.log(oData);
                                me._columnLoadError = false;
                                if (modCode === 'IOMATLIST') {
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "IOMatlistCols");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                            }else{
                                me._columnLoadError = true;
                                if (modCode === 'IOMATLIST') {
                                    me.getView().setModel(oJSONColumnsModel, "IOMatlistCols");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }

                            }
                            resolve();
                        },
                        error: function (err) {
                            me._columnLoadError = true;
                            resolve();
                        }
                    });
                });
            },

            setTableColumnsData : function(modCode){
                var me = this;
                var oColumnsModel;
                var oDataModel;

                var oColumnsData;
                var oData;

                if (modCode === 'IOMATLIST') {
                    oColumnsModel = me.getView().getModel("IOMatlistCols"); 
                    oDataModel = me.getView().getModel("IOMatlistData");  
                    
                    oData = oDataModel === undefined ? [] :oDataModel.getProperty('/results');

                    if(me._columnLoadError){
                        oData = [];
                    }
                    oColumnsData = oColumnsModel.getProperty('/');   
                    me.addColumns("ioMatListTbl", oColumnsData, oData, "IOMatlistData");
                }

            },

            addColumns: function(table, columnsData, data, model){
                var me = this;
                
                console.log(columnsData);
                console.log(data);
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

                    if (sColumnType === "STRING" || sColumnType === "DATETIME"|| sColumnType === "BOOLEAN") {
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

                return oColumnTemplate;
            },

            columnSize: function(sColumnId){
                var oColumnSize;
                if (sColumnId === "DELETED") { 
                    //Manage button
                    oColumnSize = "Center";
                }

                return oColumnSize;
            },

            callCaptionsAPI: async function(){
                var me = this;
                var oJSONModel = new JSONModel();
                var oDDTextParam = [];
                var oDDTextResult = [];
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

                oDDTextParam.push({CODE: "STYLENO"});
                oDDTextParam.push({CODE: "STATUS"});
                oDDTextParam.push({CODE: "CREATEDBY"});
                oDDTextParam.push({CODE: "CREATEDDT"});
                oDDTextParam.push({CODE: "UPDATEDBY"});
                oDDTextParam.push({CODE: "UPDATEDDT"});
                oDDTextParam.push({CODE: "IOITFMATLIST"});
                oDDTextParam.push({CODE: "LOADING"});
                
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
                            MessageBox.error(_captionList.INFO_ERROR);
                            resolve();
                        }
                    })
                })
            },

        });
    });
