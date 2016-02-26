(function($) {
    $(function(){ 
        var clientCode = 44; ///уод контрагента в 1с

        var loading = $(".loading");
        var $search = $("#search");

        var GLOBAL_OPTIONS = {
            hasOrderList: false,
            showPrice: true
        };

        // $("#show_log").click(function (e) {
        //     console.log(dataSource.view())
        // });

        $("#sendOrder").click(function (e) {
            var orderList = [];
            //[{ "code": "00000166920", "count": 45}, { "code": "00000160465", "count": 12}]
            var filteredData = getFilteredData();
            for(var i = 0; i < filteredData.length; i++) {
                orderList.push({
                    "code": filteredData[i].id,
                    "count": filteredData[i].orderCount
                });
            }
            $.soap({
                url: 'http://localhost/El/ws/WebService',
                method: 'uri:newOrder',
                envAttributes: {        
                    'xmlns:uri': 'www.URI.com',
                    'xmlns:sam': 'http://www.sample-package.org'
                },
                data: {
                    "order": { "sam:OrderItem": orderList },
                    "clientCode": clientCode
                },
                soap12: true,
                appendMethodToURL: false,
                async: true,
                HTTPHeaders: {
                    Authorization: 'Basic ' + btoa('web:web') //Логин и пароль пользователя 1с
                },
                enableLogging: true,
                success: function (soapResponse) {
                    console.log("request success");
                    var response = soapResponse.toJSON();
                    console.log(response);
                },
                error: function (SOAPResponse) {
                    console.log(SOAPResponse)
                }
            });
        });

        $('.btn-toggle').click(function() { //переключение между заказам и прайсом
            $(this).find('.btn').toggleClass('active');

            if ($(this).find('.btn-primary').size() > 0) {
                $(this).find('.btn').toggleClass('btn-primary');
            }

            $(this).find('.btn').toggleClass('btn-default');
            
            GLOBAL_OPTIONS.showPrice = !(GLOBAL_OPTIONS.showPrice);
            
            if (GLOBAL_OPTIONS.showPrice) {
                grid.dataSource.filter({});
                $search.val("");
            } else {
                filter = { field: "orderCount", operator: "gt", value: 0}; //отбор в прайсе, если "заказ" 0, то это прайс
                grid.dataSource.filter(filter);
            }
        });

        var dataSource = new kendo.data.DataSource({
            pageSize: 150,
            schema: {
                model: {
                  id: "id",
                  fields: {
                    "name": { editable: false },
                    "manufacture": { editable: false },
                    "NDS": { type: "boolean", editable: false },
                    "price": { type: "number", editable: false },
                    "expirationDate": { type: "date", editable: false },
                    "balanse": { type: "number", editable: false },
                    "GVL": { type: "boolean", editable: false },
                    "registryPrice": { type: "number", editable: false },
                    "orderCount": { type: "number" },
                    "orderSum": { type: "number", editable: false }
                  }
                }
            },
            aggregate: [
                { field: "orderSum", aggregate: "sum" }
            ],
            change: function (e) {
                GLOBAL_OPTIONS.hasOrderList = checkOrderListForOrders();
            }
        });

        function getFilteredData() {
            var filters = { field: "КоличествоЗаказано", operator: "gt", value: 0};
            var allData = dataSource.data();
            var query = new kendo.data.Query(allData);
            var filteredData = query.filter(filters).data;
            return filteredData;
        }

        var grid = $("#grid").kendoGrid({
            //autoBind: false,
            dataSource: dataSource,
            sortable: false,
            pageable: {
                messages: {
                    display: "Показано {0}-{1} из {2} записей",
                    empty: "Нет данных для отображения",
                    first: "Первая страница",
                    itemsPerPage: "записей на странице",
                    last: "Последняя страница",
                    next: "Следующая страница",
                    of: "из {0}",
                    page: "Страница",
                    previous: "Предыдущая страница",
                    refresh: "Обновить",
                    morePages:"Другие страницы"
                }
            },
            rowTemplate: kendo.template($("#rowTemplate").html()),
            altRowTemplate: kendo.template($("#rowTemplate").html()),
            editable: true,
            columns: [
            //{ field: "Код", title: "Код"  },
            { field: "name", title: "Название" },
            { field: "manufacture", title: "Производитель", width: "180px" },
            { field: "NDS", title: "НДС", width: "70px" },
            { field: "price", title: "Цена", width: "100px", format: "{0:00}" },
            { field: "expirationDate", title: "Срок", width: "120px" },
            { field: "balanse", title: "Остаток", width: "70px" },
            { field: "GVL", title: "ЖВЛ", width: "50px" },
            { field: "registryPrice", title: "Цена в реестре", width: "100px", format: "{0:00}" },
            { field: "orderCount", title: "Заказ", width: "90px", editor: orderDropDownEedit,
                footerTemplate: "Итого: "
            },
            { field: "orderSum", title: "Сумма", width: "100px", 
                format: "{0:00}", footerTemplate: "#: sum # #console.log(sum);#" }
            ]
        }).data("kendoGrid");

        function orderDropDownEedit(container, options) {
            //var dataItem = grid.dataItem($(container).closest("tr"));
            var max = options.model.balanse;//dataItem.balanse;
            $('<input data-bind="value:' + options.field + '"/>')
                .appendTo(container)
                .kendoNumericTextBox({
                    min: 0,
                    max: max,
                    step: 1,
                    change: function() {
                        var value = this.value();
                        options.model.orderSum = (value * options.model.price).toFixed(2);
                        grid.refresh();

                        console.log(options.model.orderSum, "change");
                    }
                })
        }

        $("#btn_load").click(function(e) { 
            e.preventDefault();
            loading.stop().fadeIn();
            $.soap({
                url: 'http://localhost/El/ws/WebService',
                method: 'uri:getPrice',
                envAttributes: {        
                    'xmlns:uri': 'www.URI.com',
                    'xmlns:sam': 'http://www.sample-package.org'
                },
                data: {
                    "clientCode": clientCode
                },
                soap12: true,
                appendMethodToURL: false,
                async: true,
                HTTPHeaders: {                                
                    Authorization: 'Basic ' + btoa('web:web')
                },
                enableLogging: true,
                success: function (soapResponse) {
                    console.log("request success");
                    var response = soapResponse.toJSON();                    
                    console.log("toJSON");
                    response = response.Body.getPriceResponse.return;
                    if ("price" in response) {
                        var price = response.price;
                        dataSource.data(price);
                        console.log("dataSource");
                        //grid.setDataSource(dataSource);
                        console.log("render");
                    } else {
                        alert(response);
                    }
                    loading.stop().fadeOut();
                },
                error: function (SOAPResponse) {
                    console.log(SOAPResponse)
                }
            });
            return false;
        });
        
        $search.keyup(function(e) {
            var $this = $(this);
            var val = $this.val();
            var currentFilter = grid.dataSource.filter();
            if ((val.length == 0) && (currentFilter != undefined)) { 
                grid.dataSource.filter({});
                return false; 
            }
            if (val.length < 4) { return false; };
            filter = { field: "name", operator: "contains", value: val};
            grid.dataSource.filter(filter);
            return false;
        });

        function checkOrderListForOrders() {
            var dataSourceSata = dataSource.data()

             for (var i = 0; i < dataSourceSata.length; i++) {
                 if (dataSourceSata[i].orderCount > 0) {
                     return true;
                 }
             }
             return false;
        }

        $(window).bind('beforeunload',function(){

            if (GLOBAL_OPTIONS.hasOrderList) {
                return 'you have open order';
            } else {

            }

        });


});
})(jQuery);