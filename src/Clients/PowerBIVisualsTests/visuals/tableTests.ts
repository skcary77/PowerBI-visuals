﻿//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
// </copyright>
//-----------------------------------------------------------------------

module powerbitests {
    import Table = powerbi.visuals.Table;
    import CssConstants = jsCommon.CssConstants;
    import ColumnType = tableDataViewHelper.ColumnType;
    import ValueType = powerbi.ValueType;

    var RenderDelay = 100;

    var TileLayoutConstants: any = {
        tileSpacing: 10,
        tileUnitWidth: 250,
        tileUnitHeight: 170,
        tileSmallLandscapeRowSpan: 1,
        tileSmallLandscapeColSpan: 1,
        tileMediumLandscapeRowSpan: 0,
    };
	
    TileLayoutConstants.tileMediumLandscapeRowSpan = TileLayoutConstants.tileSmallLandscapeRowSpan * 2;
    TileLayoutConstants.tileMediumLandscapeColSpan = TileLayoutConstants.tileSmallLandscapeColSpan * 2;
    TileLayoutConstants.tileLargeLandscapeRowSpan = TileLayoutConstants.tileSmallLandscapeRowSpan * 3;
    TileLayoutConstants.tileLargeLandscapeColSpan = TileLayoutConstants.tileSmallLandscapeColSpan * 3;

    describe("Table", () => {
        it('Table registered capabilities', () => {
            expect(powerbi.visuals.visualPluginFactory.create().getPlugin('table').capabilities).toBe(Table.capabilities);
        });

        it('Capabilities should include dataViewMappings', () => {
            expect(Table.capabilities.dataViewMappings).toBeDefined();
        });

        it('Capabilities should include dataRoles', () => {
            expect(Table.capabilities.dataRoles).toBeDefined();
        });

        it('Capabilities should suppressDefaultTitle',() => {
            expect(Table.capabilities.suppressDefaultTitle).toBe(true);
        });

        it('FormatString property should match calculated',() => {
            expect(powerbi.data.DataViewObjectDescriptors.findFormatString(Table.capabilities.objects)).toEqual(Table.formatStringProp);
        });

        it('table column size policy matches dashboard tile sizes', () => {
            // UX design specifies a minimum number of columns to show for each tile size if there is not enough width
            // for all the table content to fit.
            // Small Tile - 4 columns
            var smallTileWidth = calculateSmallTileWidth();
            var viewPort: powerbi.IViewport = {
                height: 100,
                width: smallTileWidth,
            };

            expect(Table.getTableColumnSizePolicy(viewPort)).toBe(powerbi.visuals.TableColumnSizePolicy.FixedColumns4);

            // Medium Tile - 5 columns
            var mediumTileWidth = calculateMediumTileWidth();
            viewPort.width = mediumTileWidth;

            expect(Table.getTableColumnSizePolicy(viewPort)).toBe(powerbi.visuals.TableColumnSizePolicy.FixedColumns5);

            // Large Tile - 7 columns
            var largeTileWidth = calculateLargeTileWidth();
            viewPort.width = largeTileWidth;

            expect(Table.getTableColumnSizePolicy(viewPort)).toBe(powerbi.visuals.TableColumnSizePolicy.FixedColumns7);
        });
    });

    interface RenderTableOptions {
        data?: powerbi.DataView;
        formatCallback?: (...args) => void;
        viewport?: powerbi.IViewport;
        settings?: powerbi.VisualSettings;
        redraw?: boolean;
        isFixedSize?: boolean;
    };

    describe("Table DOM validation", () => {
        var element: JQuery;
        var totalClassName = 'total';
        var totalTextLabel = 'Total';

        beforeEach((done) => {
            powerbitests.helpers.suppressDebugAssertFailure();
            element = powerbitests.helpers.testDom('800', '800');
            done();
        });

        it('table should only render max 25 rows', (done) => {
            var formatCalls: any[] = [];

            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'numeric', type: ValueType.fromDescriptor({ numeric: true }) }
                ],
            };

            var data: powerbi.DataView = {
                metadata: dataViewMetadata,
                table: {
                    rows: [
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                        [123456.789],
                    ],
                    columns: dataViewMetadata.columns
                },
            };

            renderTable({
                data: data,
                formatCallback: (...args) => formatCalls.push(args),
                isFixedSize: true
            });

            setTimeout(() => {
                var count = $('#testTable').find('tbody').find('tr').length;
                expect(count).toBe(23);
                done();
            }, RenderDelay);
        });

        it('table creation calls format', (done) => {
            var formatCalls: any[] = [];

            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'numeric', type: ValueType.fromDescriptor({ numeric: true }) }
                ],
            };

            var data: powerbi.DataView = {
                metadata: dataViewMetadata,
                table: {
                    rows: [
                        [123456.789]
                    ],
                    columns: dataViewMetadata.columns
                },
            };

            renderTable({
                data: data,
                formatCallback: (...args) => formatCalls.push(args),
            });

            setTimeout(() => {
                expect(formatCalls).toEqual([
                    [123456.789, '#,0.00']
                ]);

                done();
            }, 0);
        });

        it('table totals with first column non-measure', (done) => {
            var viewport: powerbi.IViewport = {
                height: 40,
                width: calculateSmallTileWidth(),
            };

            renderTable({
                data: tableDataViewHelper.getDataWithColumnsOfType(
                    [ColumnType.Text, ColumnType.NumericMeasure],
                    true,
                    undefined,
                    tableDataViewHelper.dataViewObjectsTotals(true)),
                viewport: viewport,
            });

            setTimeout(() => {
                var footer = element.find('tfoot');
                expect(footer.length).toBe(1);

                // We should have 2 footer cells. The first should say 'Total' and the second should have a total value.
                var totalCells = footer.find('td');
                expect(totalCells.length).toBe(2);

                var totalCell0 = $(totalCells[0]);
                expect(totalCell0.hasClass(totalClassName)).toBe(true);
                expect(totalCell0.text()).toBe(totalTextLabel);

                var totalCell1 = $(totalCells[1]);
                expect(totalCell1.hasClass(totalClassName)).toBe(true);
                expect(totalCell1.text()).toBe('1.00');

                done();
            }, 0);
        });

        it('table totals not enabled with first column non-measure', (done) => {
            var viewport: powerbi.IViewport = {
                height: 40,
                width: calculateSmallTileWidth(),
            };

            renderTable({
                data: tableDataViewHelper.getDataWithColumnsOfType([ColumnType.Text, ColumnType.NumericMeasure], true),
                viewport: viewport,
            });

            setTimeout(() => {
                var footer = element.find('tfoot');
                expect(footer.length).toBe(0);

                done();
            }, 0);
        });

        it('table totals with first column measure', (done) => {
            var viewport: powerbi.IViewport = {
                height: 40,
                width: calculateSmallTileWidth(),
            };

            renderTable({
                data: tableDataViewHelper.getDataWithColumnsOfType(
                    [ColumnType.NumericMeasure, ColumnType.Text],
                    true,
                    undefined,
                    tableDataViewHelper.dataViewObjectsTotals(true)),
                viewport: viewport,
            });

            setTimeout(() => {
                var footer = element.find('tfoot');
                expect(footer.length).toBe(1);

                // We should have 2 footer cells. The first should have a total value and the second should be blank.
                // We do not show the 'Total' label text anywhere since the first column is a measure (similar to PV).
                var totalCells = footer.find('td');
                expect(totalCells.length).toBe(2);

                var totalCell0 = $(totalCells[0]);
                expect(totalCell0.hasClass(totalClassName)).toBe(true);
                expect(totalCell0.text()).toBe('0.00');

                var totalCell1 = $(totalCells[1]);
                expect(totalCell1.hasClass(totalClassName)).toBe(true);
                expect(totalCell1.text()).toBe('');

                done();
            }, 0);
        });

        it('table grand totals (all measures)', (done) => {
            var viewport: powerbi.IViewport = {
                height: 40,
                width: calculateSmallTileWidth(),
            };

            renderTable({
                data: tableDataViewHelper.getDataWithColumnsOfType([ColumnType.NumericMeasure, ColumnType.NumericMeasure], false),
                viewport: viewport,
            });

            setTimeout(() => {
                // Should have no footer as there are no totals
                var footer = element.find('tfoot');
                expect(footer.length).toBe(0);

                done();
            }, 0);
        });

        it('table no measures', (done) => {
            var viewport: powerbi.IViewport = {
                height: 40,
                width: calculateSmallTileWidth(),
            };

            renderTable({
                data: tableDataViewHelper.getDataWithColumnsOfType([ColumnType.Text, ColumnType.Text], false),
                viewport: viewport,
            });

            setTimeout(() => {
                // Should have no footer as there are no totals
                var footer = element.find('tfoot');
                expect(footer.length).toBe(0);

                done();
            }, 0);
        });

        it('table totals row does not show twice', (done) => {
            renderTable({
                data: tableDataViewHelper.getDataWithColumnsOfType(
                    [ColumnType.Text, ColumnType.NumericMeasure],
                    true,
                    undefined,
                    tableDataViewHelper.dataViewObjectsTotals(true)),
                redraw: true
            });

            setTimeout(() => {
                // We should have only 1 totals row which contains 2 footer cells.
                var footer = element.find('tfoot');
                expect(footer.length).toBe(1);

                var totalCells = footer.find('td');
                expect(totalCells.length).toBe(2);

                done();
            }, RenderDelay);
        });

        it('table layout - verify height on resize', (done) => {
            var width = calculateNonTileWidth();
            var viewport: powerbi.IViewport = {
                height: 10,
                width: width,
            };

            var v = renderTable({
                data: tableDataViewHelper.getDataWithColumnsOfType(
                    [2, 0, 2, 0, 2, 0, 2, 0, 2, 0],
                    true,
                    20,
                    tableDataViewHelper.dataViewObjectsTotals(true)),
                viewport: viewport,
            });

            v.onResizing({ height: 1000, width: width }, 0);

            setTimeout(() => {
                var tableBody = $('.dataTables_scrollBody table');
                var height = tableBody.height();
                expect(height === 400 || height === 401);
                done();
            }, RenderDelay);
        });

        /* TODO: Does not work in GCI, but works when run locally.
        it('table layout - no scroll bar padding for fixed size (tile) layouts', (done) => {
            var width = calculateNonTileWidth();
            var viewport: powerbi.IViewport = {
                height: 10,
                width: 50,
            };

            var v = renderTable({
                data: getDefaultData(),
                viewport: viewport,
                isFixedSize: true,
            });

            setTimeout(() => {
                var tableContainer = $('.tableContainer');
                expect(tableContainer.hasClass(powerbi.visuals.Table.scrollbarPadClass)).toBe(false);

                var headers = $('th');
                var lastHeader = $(headers.get(headers.length - 1));
                expect(lastHeader.css(CssConstants.paddingRightProperty)).toBe('0px');

                done();
            }, RenderDelay);
        });

        it('table layout - scroll bar padding for auto size (Q&A) layouts', (done) => {
            var width = calculateNonTileWidth();
            var viewport: powerbi.IViewport = {
                height: 10,
                width: width,
            };

            var v = renderTable({
                data: getDefaultData(),
                viewport: viewport,
                isFixedSize: false,
            });

            setTimeout(() => {
                var tableContainer = $('.tableContainer');
                expect(tableContainer.hasClass(powerbi.visuals.Table.scrollbarPadClass)).toBe(true);

                var headers = $('th');
                var lastHeader = $(headers.get(headers.length - 1));
                expect(lastHeader.css(CssConstants.paddingRightProperty)).toBe('20px');

                done();
            }, RenderDelay);
        });

        it('table header alignment', (done) => {
            var viewport: powerbi.IViewport = {
                height: 40,
                width: calculateSmallTileWidth(),
            };

            // Create a table where the first column is text (left aligned) and the second column is numeric (right aligned)
            renderTable({
                data: tableDataViewHelper.getDataWithColumnsOfType([ColumnType.Text, ColumnType.Numeric], true),
                viewport: viewport,
                isFixedSize: true,
            });

            setTimeout(() => {
                var headers = element.find('th');
                expect(headers.length).toBe(2);

                // Text data
                var textHeader0 = $(headers[0]);
                expect(textHeader0.css('text-align')).toBe('left');

                // Numeric data
                var textHeader1 = $(headers[1]);
                expect(textHeader1.css('text-align')).toBe('right');

                done();
            }, 0);
        });
        */

        /* TODO: Fixed table layout is not working with 'Run JS Tests' under PhantomJS so the column sizes are all auto-sized
                 instead of the fixed sizes specified in the styles. For now the tests will be commented out until that issue
                 can be resolved, but you can still uncomment these tests and run them in IE or Chrome using 'Open in Browser'.
        it('table 4 fixed columns layout - 2 column dataset', (done) => {
            var viewport: powerbi.IViewport = {
                height: 20,
                width: calculateSmallTileWidth(),
            };

            renderTable({
                data:tableDataViewHelper.getDataWithColumns(2),
                viewport: viewport,
                isFixedSize: true,
            });

            setTimeout(() => {
                var headers = element.find('th');
                expect(headers.length).toBe(2);

                var columnSpaceSansPadding = viewport.width - Table.padding;
                var expectedColumnWidth = Math.floor(columnSpaceSansPadding / 2);

                headers.each((index, elem) => expect($(elem).width()).toBe(expectedColumnWidth));

                done();
            }, 0);
        });

        it('table 4 fixed columns layout - 5 column dataset', (done) => {
            var viewport: powerbi.IViewport = {
                height: 20,
                width: calculateSmallTileWidth(),
            };

            renderTable({
                data: helpers.getDataWithColumns(5),
                viewport: viewport,
                isFixedSize: true,
            });

            setTimeout(() => {
                var headers = element.find('th');
                expect(headers.length).toBe(5);

                // Expect to have 4 columns in the viewport
                var columnSpaceSansPadding = viewport.width - Table.padding * 3;
                var expectedColumnWidth = Math.floor(columnSpaceSansPadding / 4);
                headers.each((index, elem) => expect($(elem).width()).toBe(expectedColumnWidth));

                done();
            }, 0);
        });

        it('table 5 fixed columns layout - 2 column dataset', (done) => {
            var viewport: powerbi.IViewport = {
                height: 20,
                width: calculateMediumTileWidth(),
            };

            renderTable({
                data:tableDataViewHelper.getDataWithColumns(2),
                viewport: viewport,
                isFixedSize: true,
            });

            setTimeout(() => {
                var headers = element.find('th');
                expect(headers.length).toBe(2);

                var columnSpaceSansPadding = viewport.width - Table.padding;
                var expectedColumnWidth = Math.floor(columnSpaceSansPadding / 2);

                headers.each((index, elem) => expect($(elem).width()).toBe(expectedColumnWidth));

                done();
            }, 0);
        });

        it('table 5 fixed columns layout - 6 column dataset', (done) => {
            var viewport: powerbi.IViewport = {
                height: 20,
                width: calculateMediumTileWidth(),
            };

            renderTable({
                data:tableDataViewHelper.getDataWithColumns(6),
                viewport: viewport,
                isFixedSize: true,
            });

            setTimeout(() => {
                var headers = element.find('th');
                expect(headers.length).toBe(6);

                // Expect to have 5 columns in the viewport
                var columnSpaceSansPadding = viewport.width - Table.padding * 4;
                var expectedColumnWidth = Math.floor(columnSpaceSansPadding / 5);
                headers.each((index, elem) => expect($(elem).width()).toBe(expectedColumnWidth));

                done();
            }, 0);
        });

        it('table 7 fixed columns layout - 2 column dataset', (done) => {
            var viewport: powerbi.IViewport = {
                height: 20,
                width: calculateLargeTileWidth(),
            };

            renderTable({
                data:tableDataViewHelper.getDataWithColumns(2),
                viewport: viewport,
                isFixedSize: true,
            });

            setTimeout(() => {
                var headers = element.find('th');
                expect(headers.length).toBe(2);

                var columnSpaceSansPadding = viewport.width - Table.padding;
                var expectedColumnWidth = Math.floor(columnSpaceSansPadding / 2);

                headers.each((index, elem) => expect($(elem).width()).toBe(expectedColumnWidth));

                done();
            }, 0);
        });

        it('table 7 fixed columns layout - 8 column dataset', (done) => {
            var viewport: powerbi.IViewport = {
                height: 20,
                width: calculateLargeTileWidth(),
            };

            renderTable({
                data:tableDataViewHelper.getDataWithColumns(8),
                viewport: viewport,
                isFixedSize: true,
            });

            setTimeout(() => {
                var headers = element.find('th');
                expect(headers.length).toBe(8);

                // Expect to have 7 columns in the viewport
                var columnSpaceSansPadding = viewport.width - Table.padding * 6;
                var expectedColumnWidth = Math.floor(columnSpaceSansPadding / 7);
                headers.each((index, elem) => expect($(elem).width()).toBe(expectedColumnWidth));

                done();
            }, 0);
        });
        */

        it('table auto scrolling layout - verify headers', (done) => {
            var viewport: powerbi.IViewport = {
                height: 15,
                width: calculateNonTileWidth(),
            };

            renderTable({
                data:tableDataViewHelper.getDataWithColumns(15),
                viewport: viewport,
            });

            setTimeout(() => {
                var tableBody = $('.dataTables_scrollBody table');
                var bodyHeaders = tableBody.find('th');
                expect(bodyHeaders.length).toBe(15);

                var tableHead = $('.dataTables_scrollHead table');
                var headHeaders = tableHead.find('th');
                expect(headHeaders.length).toBe(15);

                done();
            }, 0);
        });

        it('table auto scrolling layout - verify footers', (done) => {
            var viewport: powerbi.IViewport = {
                height: 10,
                width: calculateNonTileWidth(),
            };

            renderTable({
                data: tableDataViewHelper.getDataWithColumnsOfType(
                    [2, 0, 2, 0, 2, 0, 2, 0, 2, 0],
                    true,
                    undefined,
                    tableDataViewHelper.dataViewObjectsTotals(true)),
                viewport: viewport,
            });

            setTimeout(() => {
                var tableFoot = $('.dataTables_scrollFoot table');
                var footColumns = tableFoot.find('td');
                expect(footColumns.length).toBe(10);

                // We should expect totals for every other column
                for (var i = 0; i < footColumns.length; ++i) {
                    if (i % 2 === 0)
                        expect(footColumns[i].textContent !== '');
                }

                done();
            }, RenderDelay);
        });

        it('table auto scrolling layout - verify scrolling', (done) => {
            var viewport: powerbi.IViewport = {
                height: 15,
                width: calculateNonTileWidth(),
            };

            renderTable({
                data:tableDataViewHelper.getDataWithColumns(30),
                viewport: viewport,
            });

            setTimeout(() => {
                var tableHead = $('.table');

                // Expect that the width of the columns exceeds the width of the tableContainer,
                // indicating that the table scrolls
                expect(tableHead.width()).toBeGreaterThan($('.tableContainer').width());

                done();
            }, RenderDelay);
        });

        it('table auto scrolling layout - verify fixed header/footer tables', (done) => {
            var viewport: powerbi.IViewport = {
                height: 15,
                width: calculateNonTileWidth(),
            };

            renderTable({
                data: tableDataViewHelper.getDataWithColumns(
                    15,
                    undefined,
                    tableDataViewHelper.dataViewObjectsTotals(true)),
                viewport: viewport,
            });

            setTimeout(() => {
                // Expect that we have three tables set up, each for header/footer/body
                var tableBody = $('.dataTables_scrollBody table');
                var tableHead = $('.dataTables_scrollHead table');
                var tableFoot = $('.dataTables_scrollFoot table');
                expect(tableBody).not.toBeEmpty();
                expect(tableHead).not.toBeEmpty();
                expect(tableFoot).not.toBeEmpty();

                done();
            }, RenderDelay);
        });

        it('table auto scrolling layout - verify column widths are the same', (done) => {
            var viewport: powerbi.IViewport = {
                height: 15,
                width: calculateNonTileWidth(),
            };

            renderTable({
                data: tableDataViewHelper.getDataWithColumnsOfType(
                    [2, 0, 2, 0, 2, 0, 2, 0, 2, 0],
                    true,
                    undefined,
                    tableDataViewHelper.dataViewObjectsTotals(true)),
                viewport: viewport,
            });

            setTimeout(() => {
                var tableBodyThs = $('.dataTables_scrollBody table').find('th');
                var tableHeadThs = $('.dataTables_scrollHead table').find('th');

                for (var i = 0; i < 10; i++) {
                    expect($(tableBodyThs[i]).width()).toBe($(tableHeadThs[i]).width());
                }

                done();
            }, RenderDelay);
        });    

        it('table body height with totals - verify body height is calculated based on header and footer heights', (done) => {
            var viewport: powerbi.IViewport = {
                height: 50,
                width: calculateNonTileWidth(),
            };

            renderTable({
                data: tableDataViewHelper.getDataWithColumnsOfType(
                    [ColumnType.Text, ColumnType.NumericMeasure],
                    true,
                    undefined,
                    tableDataViewHelper.dataViewObjectsTotals(true)),
                viewport: viewport,
            });

            setTimeout(() => {
                var dataTableScrollHeight = $('.dataTables_scroll').height();
                var headerHeight = $('.dataTables_scrollHead').outerHeight();
                var footerHeight = $('.dataTables_scrollFoot').outerHeight();
                var tableBodyHeight = $('.dataTables_scrollBody').outerHeight();
                expect(tableBodyHeight).toBeGreaterThan(0);
                expect(tableBodyHeight).toBe(dataTableScrollHeight - headerHeight - footerHeight);

                done();
            }, RenderDelay);
        });

        it('table body height without the totals - verify body height is calculated based on header height', (done) => {
            var viewport: powerbi.IViewport = {
                height: 50,
                width: calculateNonTileWidth(),
            };

            renderTable({
                data: tableDataViewHelper.getDataWithColumnsOfType(
                    [ColumnType.Text, ColumnType.NumericMeasure],
                    true,
                    undefined,
                    tableDataViewHelper.dataViewObjectsTotals(false)),
                viewport: viewport,
            });

            setTimeout(() => {
                var dataTableScrollHeight = $('.dataTables_scroll').height();
                var headerHeight = $('.dataTables_scrollHead').outerHeight();
                var tableBodyHeight = $('.dataTables_scrollBody').outerHeight();
                expect(tableBodyHeight).toBeGreaterThan(0);
                expect(tableBodyHeight).toBe(dataTableScrollHeight - headerHeight);

                done();
            }, RenderDelay);
        });

        it('table sort with datetime column - verify sort by date functionality is working in a table by clicking on column name', (done) => {

            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'date', type: ValueType.fromDescriptor({ time: true }) }
                ],
            };

            var data: powerbi.DataView = {
                metadata: dataViewMetadata,
                table: {
                    rows: [
                        [new Date('8/4/1999 3:00:00 AM')],
                        [new Date('8/4/1999')],
                        [new Date('8/4/1999 12:00:00 PM')]
                    ],
                    columns: dataViewMetadata.columns
                },
            };

            renderTable({
                data: data,
            });

            setTimeout(() => {
                var element = $('.dataTables_scrollHead table').find('th');

                expect(element.text()).toBe('date');

                // First click enables the table to be sorted in ascending order
                element.trigger('click');

                var firstRowValue = $('.dataTables_scrollBody table tbody tr').first().find('td');
                expect(firstRowValue.text()).toBe('8/4/1999 12:00:00 AM');

                // Sort the table by descending order
                element.trigger('click');

                firstRowValue = $('.dataTables_scrollBody table tbody tr').first().find('td');
                expect(firstRowValue.text()).toBe('8/4/1999 12:00:00 PM');

                done();
            }, RenderDelay);
        });

        function renderTable(options: RenderTableOptions): powerbi.IVisual {
            var viewport = options.viewport ? options.viewport : { height: element.height(), width: element.width() };
            var data = options.data ? options.data : getDefaultData();
            var redraw = options.redraw ? options.redraw : false;
            var style = powerbi.visuals.visualStyles.create();

            element.width(viewport.width);
            element.css(CssConstants.minWidthProperty, viewport.width);
            element.css(CssConstants.maxWidthProperty, viewport.width);
            element.css(CssConstants.positionProperty, CssConstants.absoluteValue);

            var hostService: powerbi.IVisualHostServices = <any>{
                getLocalizedString: (stringId: string) => totalTextLabel,
            };

            if (options.formatCallback)
                spyOn(powerbi.visuals.valueFormatter, 'formatRaw').and.callFake(options.formatCallback);

            var v: powerbi.IVisual = powerbi.visuals.visualPluginFactory.create().getPlugin('table').create();
            v.init({
                element: element,
                host: hostService,
                style: style,
                viewport: viewport,
                settings: options.settings,
                interactivity: {
                    overflow: options.isFixedSize ? 'hidden': 'visible'
                }
            });

            v.onDataChanged({ dataViews: [data] });

            var table = $('.table');
            table.attr('id', 'testTable');
            expect(table).toBeInDOM();

            if (redraw)
                v.onResizing({ height: viewport.height, width: viewport.width }, 0);

            return v;
        }

        function getDefaultData(): powerbi.DataView {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'numeric', type: ValueType.fromDescriptor({ numeric: true }) }
                ],
            };

            var data: powerbi.DataView = {
                metadata: dataViewMetadata,
                table: {
                    rows: [
                        [123456.789]
                    ],
                    columns: dataViewMetadata.columns
                },
            };

            return data;
        }
    });

    function calculateSmallTileWidth(): number {
        return calculateTileWidth(TileLayoutConstants.tileSmallLandscapeColSpan);
    }

    function calculateMediumTileWidth(): number {
        return calculateTileWidth(TileLayoutConstants.tileMediumLandscapeColSpan);
    }

    function calculateLargeTileWidth(): number {
        return calculateTileWidth(TileLayoutConstants.tileLargeLandscapeColSpan);
    }

    function calculateNonTileWidth(): number {
        return calculateTileWidth(TileLayoutConstants.tileLargeLandscapeColSpan + 1);
    }

    function calculateTileWidth(columnSpan: number): number {
        return TileLayoutConstants.tileUnitWidth * columnSpan + TileLayoutConstants.tileSpacing * (columnSpan - 1);
    }
}