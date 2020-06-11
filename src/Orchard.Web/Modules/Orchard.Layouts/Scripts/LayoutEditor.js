angular.module("LayoutEditor", ["ngSanitize", "ngResource", "ui.sortable"]);
var LayoutEditor;
(function(LayoutEditor) {

    var Clipboard = function () {
        var self = this;
        this._clipboardData = {};
        this._isDisabled = false;
        this._wasInvoked = false;

        this.setData = function(contentType, data) {
            self._clipboardData[contentType] = data;
            self._wasInvoked = true;
        };
        this.getData = function (contentType) {
            return self._clipboardData[contentType];
            self._wasInvoked = true;
        };
        this.disable = function() {
            self._isDisabled = true;
            self._wasInvoked = false;
            self._clipboardData = {};
        };
        this.isDisabled = function () {
            return self._isDisabled;
        }
        this.wasInvoked = function () {
            return self._wasInvoked;
        }
    }

    LayoutEditor.Clipboard = new Clipboard();

    angular
        .module("LayoutEditor")
        .factory("clipboard", [
            function() {
                return {
                    setData: LayoutEditor.Clipboard.setData,
                    getData: LayoutEditor.Clipboard.getData,
                    disable: LayoutEditor.Clipboard.disable,
                    isDisabled: LayoutEditor.Clipboard.isDisabled,
                    wasInvoked: LayoutEditor.Clipboard.wasInvoked
                };
            }
        ]);
})(LayoutEditor || (LayoutEditor = {}));
angular
    .module("LayoutEditor")
    .factory("scopeConfigurator", ["$timeout", "clipboard",
        function ($timeout, clipboard) {
            return {

                configureForElement: function ($scope, $element) {
                
                    $element.find(".layout-panel").click(function (e) {
                        e.stopPropagation();
                    });

                    $element.parent().keydown(function (e) {
                        var handled = false;
                        var resetFocus = false;
                        var element = $scope.element;
                    
                        if (element.editor.isDragging || element.editor.inlineEditingIsActive)
                            return;

                        // If native clipboard support exists, the pseudo-clipboard will have been disabled.
                        if (!clipboard.isDisabled()) {
                            var focusedElement = element.editor.focusedElement;
                            if (!!focusedElement) {
                                // Pseudo clipboard handling for browsers not allowing real clipboard operations.
                                if (e.ctrlKey) {
                                    switch (e.which) {
                                    case 67: // C
                                        focusedElement.copy(clipboard);
                                        break;
                                    case 88: // X
                                        focusedElement.cut(clipboard);
                                        break;
                                    case 86: // V
                                        focusedElement.paste(clipboard);
                                        break;
                                    }
                                }
                            }
                        }

                        if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 46) { // Del
                            $scope.delete(element);
                            handled = true;
                        } else if (!e.ctrlKey && !e.shiftKey && !e.altKey && (e.which == 32 || e.which == 27)) { // Space or Esc
                            $element.find(".layout-panel-action-properties").first().click();
                            handled = true;
                        }

                        if (element.type == "Content") { // This is a content element.
                            if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 13) { // Enter
                                $element.find(".layout-panel-action-edit").first().click();
                                handled = true;
                            }
                        }

                        if (!!element.children) { // This is a container.
                            if (!e.ctrlKey && !e.shiftKey && e.altKey && e.which == 40) { // Alt+Down
                                if (element.children.length > 0)
                                    element.children[0].setIsFocused();
                                handled = true;
                            }

                            if (element.type == "Column") { // This is a column.
                                var connectAdjacent = !e.ctrlKey;
                                if (e.which == 37) { // Left
                                    if (e.altKey)
                                        element.expandLeft(connectAdjacent);
                                    if (e.shiftKey)
                                        element.contractRight(connectAdjacent);
                                    handled = true;
                                } else if (e.which == 39) { // Right
                                    if (e.altKey)
                                        element.contractLeft(connectAdjacent);
                                    if (e.shiftKey)
                                        element.expandRight(connectAdjacent);
                                    handled = true;
                                }
                            }
                        }

                        if (!!element.parent) { // This is a child.
                            if (e.altKey && e.which == 38) { // Alt+Up
                                element.parent.setIsFocused();
                                handled = true;
                            }

                            if (element.parent.type == "Row") { // Parent is a horizontal container.
                                if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 37) { // Left
                                    element.parent.moveFocusPrevChild(element);
                                    handled = true;
                                }
                                else if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 39) { // Right
                                    element.parent.moveFocusNextChild(element);
                                    handled = true;
                                }
                                else if (e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 37) { // Ctrl+Left
                                    element.moveUp();
                                    resetFocus = true;
                                    handled = true;
                                }
                                else if (e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 39) { // Ctrl+Right
                                    element.moveDown();
                                    handled = true;
                                }
                            }
                            else { // Parent is a vertical container.
                                if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 38) { // Up
                                    element.parent.moveFocusPrevChild(element);
                                    handled = true;
                                }
                                else if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 40) { // Down
                                    element.parent.moveFocusNextChild(element);
                                    handled = true;
                                }
                                else if (e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 38) { // Ctrl+Up
                                    element.moveUp();
                                    resetFocus = true;
                                    handled = true;
                                }
                                else if (e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 40) { // Ctrl+Down
                                    element.moveDown();
                                    handled = true;
                                }
                            }
                        }

                        if (handled) {
                            e.preventDefault();
                        }

                        e.stopPropagation();

                        $scope.$apply(); // Event is not triggered by Angular directive but raw event handler on element.

                        // HACK: Workaround because of how Angular treats the DOM when elements are shifted around - input focus is sometimes lost.
                        if (resetFocus) {
                            window.setTimeout(function () {
                                $scope.$apply(function () {
                                    element.editor.focusedElement.setIsFocused();
                                });
                            }, 100);
                        }
                    });

                    $scope.element.setIsFocusedEventHandlers.push(function () {
                        $element.parent().focus();
                    });

                    $scope.delete = function (element) {
                        element.delete();
                    }
                },

                configureForContainer: function ($scope, $element) {
                    var element = $scope.element;

                    //$scope.isReceiving = false; // True when container is receiving an external element via drag/drop.
                    $scope.getShowChildrenPlaceholder = function () {
                        return $scope.element.children.length === 0 && !$scope.element.getIsDropTarget();
                    };

                    $scope.sortableOptions = {
                        cursor: "move",
                        delay: 150,
                        disabled: element.getIsSealed(),
                        distance: 5,
                        //handle: element.children.length < 2 ? ".imaginary-class" : false, // For some reason doesn't get re-evaluated after adding more children.
                        start: function (e, ui) {
                            $scope.$apply(function () {
                                element.setIsDropTarget(true);
                                element.editor.isDragging = true;
                            });
                            // Make the drop target placeholder as high as the item being dragged.
                            ui.placeholder.height(ui.item.height() - 4);
                            ui.placeholder.css("min-height", 0);
                        },
                        stop: function (e, ui) {
                            $scope.$apply(function () {
                                element.editor.isDragging = false;
                                element.setIsDropTarget(false);
                            });
                        },
                        over: function (e, ui) {
                            if (!!ui.sender && !!ui.sender[0].isToolbox) {
                                if (!!ui.sender[0].dropTargetTimeout) {
                                    $timeout.cancel(ui.sender[0].dropTargetTimeout);
                                    ui.sender[0].dropTargetTimeout = null;
                                }
                                $timeout(function () {
                                    if (element.type == "Row") {
                                        // If there was a previous drop target and it was a row, roll back any pending column adds to it.
                                        var previousDropTarget = element.editor.dropTargetElement;
                                        if (!!previousDropTarget && previousDropTarget.type == "Row")
                                            previousDropTarget.rollbackAddColumn();
                                    }
                                    element.setIsDropTarget(false);
                                });
                                ui.sender[0].dropTargetTimeout = $timeout(function () {
                                    if (element.type == "Row") {
                                        var receivedColumn = ui.item.sortable.model;
                                        var receivedColumnWidth = Math.floor(12 / (element.children.length + 1));
                                        receivedColumn.width = receivedColumnWidth;
                                        receivedColumn.offset = 0;
                                        element.beginAddColumn(receivedColumnWidth);
                                        // Make the drop target placeholder the correct width and as high as the highest existing column in the row.
                                        var maxHeight = _.max(_($element.find("> .layout-children > .layout-column:not(.ui-sortable-placeholder)")).map(function (e) {
                                            return $(e).height();
                                        }));
                                        for (i = 1; i <= 12; i++)
                                            ui.placeholder.removeClass("col-xs-" + i);
                                        ui.placeholder.addClass("col-xs-" + receivedColumn.width);
                                        if (maxHeight > 0) {
                                            ui.placeholder.height(maxHeight);
                                            ui.placeholder.css("min-height", 0);
                                        }
                                        else {
                                            ui.placeholder.height(0);
                                            ui.placeholder.css("min-height", "");
                                        }
                                    }
                                    element.setIsDropTarget(true);
                                }, 150);
                            }
                        },
                        receive: function (e, ui) {
                            if (!!ui.sender && !!ui.sender[0].isToolbox) {
                                $scope.$apply(function () {
                                    var receivedElement = ui.item.sortable.model;
                                    if (!!receivedElement) {
                                        if (element.type == "Row")
                                            element.commitAddColumn();
                                        // Should ideally call LayoutEditor.Container.addChild() instead, but since this handler
                                        // is run *before* the ui-sortable directive's handler, if we try to add the child to the
                                        // array that handler will get an exception when trying to do the same.
                                        // Because of this, we need to invoke "setParent" so that specific container types can perform element speficic initialization.
                                        receivedElement.setEditor(element.editor);
                                        receivedElement.setParent(element);
                                        if (!!receivedElement.hasEditor) {
                                            $scope.$root.editElement(receivedElement).then(function (args) {
                                                if (!args.cancel) {
                                                    receivedElement.data = args.element.data;

                                                    if (receivedElement.setHtml)
                                                        receivedElement.setHtml(args.element.html);
                                                }
                                                $timeout(function () {
                                                    if (!!args.cancel)
                                                        receivedElement.delete();
                                                    else
                                                        receivedElement.setIsFocused();
                                                    //$scope.isReceiving = false;
                                                    element.setIsDropTarget(false);

                                                });
                                                return;
                                            });
                                        }
                                    }
                                    $timeout(function () {
                                        //$scope.isReceiving = false;
                                        element.setIsDropTarget(false);
                                        if (!!receivedElement)
                                            receivedElement.setIsFocused();
                                    });
                                });
                            }
                        }
                    };

                    $scope.click = function (child, e) {
                        if (!child.editor.isDragging)
                            child.setIsFocused();
                        e.stopPropagation();
                    };

                    $scope.getClasses = function (child) {
                        var result = ["layout-element"];

                        if (!!child.children) {
                            result.push("layout-container");
                            if (child.getIsSealed())
                                result.push("layout-container-sealed");
                        }

                        result.push("layout-" + child.type.toLowerCase());

                        if (!!child.dropTargetClass)
                            result.push(child.dropTargetClass);

                        // TODO: Move these to either the Column directive or the Column model class.
                        if (child.type == "Row") {
                            result.push("row");
                            if (!child.canAddColumn())
                                result.push("layout-row-full");
                        }
                        if (child.type == "Column") {
                            result.push("col-xs-" + child.width);
                            result.push("col-xs-offset-" + child.offset);
                        }
                        if (child.type == "Content")
                            result.push("layout-content-" + child.contentTypeClass);

                        if (child.getIsActive())
                            result.push("layout-element-active");
                        if (child.getIsFocused())
                            result.push("layout-element-focused");
                        if (child.getIsSelected())
                            result.push("layout-element-selected");
                        if (child.getIsDropTarget())
                            result.push("layout-element-droptarget");
                        if (child.isTemplated)
                            result.push("layout-element-templated");

                        return result;
                    };
                }
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutEditor", ["environment",
        function (environment) {
            return {
                restrict: "E",
                scope: {},
                controller: ["$scope", "$element", "$attrs", "$compile", "clipboard",
                    function ($scope, $element, $attrs, $compile, clipboard) {
                        if (!!$attrs.model)
                            $scope.element = eval($attrs.model);
                        else
                            throw new Error("The 'model' attribute must evaluate to a LayoutEditor.Editor object.");

                        $scope.click = function (canvas, e) {
                            if (!canvas.editor.isDragging)
                                canvas.setIsFocused();
                            e.stopPropagation();
                        };

                        $scope.getClasses = function (canvas) {
                            var result = ["layout-element", "layout-container", "layout-canvas"];

                            if (canvas.getIsActive())
                                result.push("layout-element-active");
                            if (canvas.getIsFocused())
                                result.push("layout-element-focused");
                            if (canvas.getIsSelected())
                                result.push("layout-element-selected");
                            if (canvas.getIsDropTarget())
                                result.push("layout-element-droptarget");
                            if (canvas.isTemplated)
                                result.push("layout-element-templated");

                            return result;
                        };

                        // An unfortunate side-effect of the next hack on line 54 is that the created elements aren't added to the DOM yet, so we can't use it to get to the parent ".layout-desiger" element.
                        // Work around: access that element directly (which efectively turns multiple layout editors on a single page impossible). 
                        // //var layoutDesignerHost = $element.closest(".layout-designer").data("layout-designer-host");
                        var layoutDesignerHost = $(".layout-designer").data("layout-designer-host");

                        $scope.$root.layoutDesignerHost = layoutDesignerHost;

                        layoutDesignerHost.element.on("replacecanvas", function (e, args) {
                            var editor = $scope.element;
                            var canvasData = {
                                data: args.canvas.data,
                                htmlId: args.canvas.htmlId,
                                htmlClass: args.canvas.htmlClass,
                                htmlStyle: args.canvas.htmlStyle,
                                isTemplated: args.canvas.isTemplated,
                                children: args.canvas.children
                            };

                            // HACK: Instead of simply updating the $scope.element with a new instance, we need to replace the entire orc-layout-editor markup
                            // in order for angular to rebind starting with the Canvas element. Otherwise, for some reason, it will rebind starting with the first child of Canvas.
                            // You can see this happening when setting a breakpoint in ScopeConfigurator where containers are initialized with drag & drop: on page load, the first element
                            // is a Canvas (good), but after having selected another template, the first element is (typically) a Grid (bad).
                            // Simply recompiling the orc-layout-editor directive will cause the entire thing to be generated, which works just fine as well (even though not is nice as simply leveraging model binding).
                            layoutDesignerHost.editor = window.layoutEditor = new LayoutEditor.Editor(editor.config, canvasData);
                            var template = "<orc-layout-editor" + " model='window.layoutEditor' />";
                            var html = $compile(template)($scope);
                            $(".layout-editor-holder").html(html);
                        });

                        $scope.$root.editElement = function (element) {
                            var host = $scope.$root.layoutDesignerHost;
                            return host.editElement(element);
                        };

                        $scope.$root.addElement = function (contentType) {
                            var host = $scope.$root.layoutDesignerHost;
                            return host.addElement(contentType);
                        };

                        $scope.toggleInlineEditing = function () {
                            if (!$scope.element.inlineEditingIsActive) {
                                $scope.element.inlineEditingIsActive = true;
                                $element.find(".layout-toolbar-container").show();
                                var selector = "#layout-editor-" + $scope.$id + " .layout-html .layout-content-markup[data-templated=false]";
                                var firstContentEditorId = $(selector).first().attr("id");
                                tinymce.init({
                                    selector: selector,
                                    theme: "modern",
                                    schema: "html5",
                                    plugins: [
                                        "advlist autolink lists link image charmap print preview hr anchor pagebreak",
                                        "searchreplace wordcount visualblocks visualchars code fullscreen",
                                        "insertdatetime media nonbreaking table contextmenu directionality",
                                        "emoticons template paste textcolor colorpicker textpattern",
                                        "fullscreen autoresize"
                                    ],
                                    toolbar: "undo redo cut copy paste | bold italic | bullist numlist outdent indent formatselect | alignleft aligncenter alignright alignjustify ltr rtl | link unlink charmap | code fullscreen close",
                                    convert_urls: false,
                                    valid_elements: "*[*]",
                                    // Shouldn't be needed due to the valid_elements setting, but TinyMCE would strip script.src without it.
                                    extended_valid_elements: "script[type|defer|src|language]",
                                    statusbar: false,
                                    skin: "orchardlightgray",
                                    inline: true,
                                    fixed_toolbar_container: "#layout-editor-" + $scope.$id + " .layout-toolbar-container",
                                    init_instance_callback: function (editor) {
                                        if (editor.id == firstContentEditorId)
                                            tinymce.execCommand("mceFocus", false, editor.id);
                                    }
                                });
                            }
                            else {
                                tinymce.remove("#layout-editor-" + $scope.$id + " .layout-content-markup");
                                $element.find(".layout-toolbar-container").hide();
                                $scope.element.inlineEditingIsActive = false;
                            }
                        };

                        $(document).on("cut copy paste", function (e) {
                            // If the pseudo clipboard was already invoked (which happens on the first clipboard
                            // operation after page load even if native clipboard support exists) then sit this
                            // one operation out, but make sure whatever is on the pseudo clipboard gets migrated
                            // to the native clipboard for subsequent operations.
                            if (clipboard.wasInvoked()) {
                                e.originalEvent.clipboardData.setData("text/plain", clipboard.getData("text/plain"));
                                e.originalEvent.clipboardData.setData("text/json", clipboard.getData("text/json"));
                                e.preventDefault();
                            }
                            else {
                                var focusedElement = $scope.element.focusedElement;
                                if (!!focusedElement) {
                                    $scope.$apply(function () {
                                        switch (e.type) {
                                            case "copy":
                                                focusedElement.copy(e.originalEvent.clipboardData);
                                                break;
                                            case "cut":
                                                focusedElement.cut(e.originalEvent.clipboardData);
                                                break;
                                            case "paste":
                                                focusedElement.paste(e.originalEvent.clipboardData);
                                                break;
                                        }
                                    });

                                    // HACK: Workaround because of how Angular treats the DOM when elements are shifted around - input focus is sometimes lost.
                                    window.setTimeout(function () {
                                        $scope.$apply(function () {
                                            if (!!$scope.element.focusedElement)
                                                $scope.element.focusedElement.setIsFocused();
                                        });
                                    }, 100);

                                    e.preventDefault();
                                }
                            }

                            // Native clipboard support obviously exists, so disable the peudo clipboard from now on.
                            clipboard.disable();
                        });
                    }
                ],
                templateUrl: environment.templateUrl("Editor"),
                replace: true,
                link: function (scope, element) {
                    // No clicks should propagate from the TinyMCE toolbars.
                    element.find(".layout-toolbar-container").click(function (e) {
                        e.stopPropagation();
                    });
                    // Intercept mousedown on editor while in inline editing mode to 
                    // prevent current editor from losing focus.
                    element.mousedown(function (e) {
                        if (scope.element.inlineEditingIsActive) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    })
                    // Unfocus and unselect everything on click outside of canvas.
                    $(window).click(function (e) {
                        // Except when in inline editing mode.
                        if (!scope.element.inlineEditingIsActive) {
                            scope.$apply(function () {
                                scope.element.activeElement = null;
                                scope.element.focusedElement = null;
                            });
                        }
                    });
                }
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutCanvas", ["scopeConfigurator", "environment",
        function (scopeConfigurator, environment) {
            return {
                restrict: "E",
                scope: { element: "=" },
                controller: ["$scope", "$element", "$attrs",
                    function ($scope, $element, $attrs) {
                        scopeConfigurator.configureForElement($scope, $element);
                        scopeConfigurator.configureForContainer($scope, $element);
                        $scope.sortableOptions["axis"] = "y";
                    }
                ],
                templateUrl: environment.templateUrl("Canvas"),
                replace: true
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutChild", ["$compile",
        function ($compile) {
            return {
                restrict: "E",
                scope: { element: "=" },
                link: function (scope, element) {
                    var template = "<orc-layout-" + scope.element.type.toLowerCase() + " element='element' />";
                    var html = $compile(template)(scope);
                    $(element).replaceWith(html);
                }
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutColumn", ["$compile", "scopeConfigurator", "environment",
        function ($compile, scopeConfigurator, environment) {
            return {
                restrict: "E",
                scope: { element: "=" },
                controller: ["$scope", "$element",
                    function ($scope, $element) {
                        scopeConfigurator.configureForElement($scope, $element);
                        scopeConfigurator.configureForContainer($scope, $element);
                        $scope.sortableOptions["axis"] = "y";
                    }
                ],
                templateUrl: environment.templateUrl("Column"),
                replace: true,
                link: function (scope, element, attrs) {
                    element.find(".layout-column-resize-bar").draggable({
                        axis: "x",
                        helper: "clone",
                        revert: true,
                        start: function (e, ui) {
                            scope.$apply(function () {
                                scope.element.editor.isResizing = true;
                            });
                        },
                        drag: function (e, ui) {
                            var columnElement = element.parent();
                            var columnSize = columnElement.width() / scope.element.width;
                            var connectAdjacent = !e.ctrlKey;
                            if ($(e.target).hasClass("layout-column-resize-bar-left")) {
                                var delta = ui.offset.left - columnElement.offset().left;
                                if (delta < -columnSize && scope.element.canExpandLeft(connectAdjacent)) {
                                    scope.$apply(function () {
                                        scope.element.expandLeft(connectAdjacent);
                                    });
                                }
                                else if (delta > columnSize && scope.element.canContractLeft(connectAdjacent)) {
                                    scope.$apply(function () {
                                        scope.element.contractLeft(connectAdjacent);
                                    });
                                }
                            }
                            else if ($(e.target).hasClass("layout-column-resize-bar-right")) {
                                var delta = ui.offset.left - columnElement.width() - columnElement.offset().left;
                                if (delta > columnSize && scope.element.canExpandRight(connectAdjacent)) {
                                    scope.$apply(function () {
                                        scope.element.expandRight(connectAdjacent);
                                    });
                                }
                                else if (delta < -columnSize && scope.element.canContractRight(connectAdjacent)) {
                                    scope.$apply(function () {
                                        scope.element.contractRight(connectAdjacent);
                                    });
                                }
                            }

                        },
                        stop: function (e, ui) {
                            scope.$apply(function () {
                              scope.element.editor.isResizing = false;
                            });
                        }
                    });
                }
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutContent", ["$sce", "scopeConfigurator", "environment",
        function ($sce, scopeConfigurator, environment) {
            return {
                restrict: "E",
                scope: { element: "=" },
                controller: ["$scope", "$element",
                    function ($scope, $element) {
                        scopeConfigurator.configureForElement($scope, $element);
                        $scope.edit = function () {
                            $scope.$root.editElement($scope.element).then(function (args) {
                                $scope.$apply(function () {
                                    if (args.cancel)
                                        return;

                                    $scope.element.data = args.element.data;
                                    $scope.element.setHtml(args.element.html);
                                });
                            });
                        };

                        // Overwrite the setHtml function so that we can use the $sce service to trust the html (and not have the html binding strip certain tags).
                        $scope.element.setHtml = function (html) {
                            $scope.element.html = html;
                            $scope.element.htmlUnsafe = $sce.trustAsHtml(html);
                        };

                        $scope.element.setHtml($scope.element.html);
                    }
                ],
                templateUrl: environment.templateUrl("Content"),
                replace: true
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutHtml", ["$sce", "scopeConfigurator", "environment",
        function ($sce, scopeConfigurator, environment) {
            return {
                restrict: "E",
                scope: { element: "=" },
                controller: ["$scope", "$element",
                    function ($scope, $element) {
                        scopeConfigurator.configureForElement($scope, $element);
                        $scope.edit = function () {
                            $scope.$root.editElement($scope.element).then(function (args) {
                                $scope.$apply(function () {
                                    if (args.cancel)
                                        return;

                                    $scope.element.data = args.element.data;
                                    $scope.element.setHtml(args.element.html);
                                });
                            });
                        };
                        $scope.updateContent = function (e) {
                            $scope.element.setHtml(e.target.innerHTML);
                        };

                        // Overwrite the setHtml function so that we can use the $sce service to trust the html (and not have the html binding strip certain tags).
                        $scope.element.setHtml = function (html) {
                            $scope.element.html = html;
                            $scope.element.htmlUnsafe = $sce.trustAsHtml(html);
                        };

                        $scope.element.setHtml($scope.element.html);
                    }
                ],
                templateUrl: environment.templateUrl("Html"),
                replace: true,
                link: function (scope, element) {
                    // Mouse down events must not be intercepted by drag and drop while inline editing is active,
                    // otherwise clicks in inline editors will have no effect.
                    element.find(".layout-content-markup").mousedown(function (e) {
                        if (scope.element.editor.inlineEditingIsActive) {
                            e.stopPropagation();
                        }
                    });
                }
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutGrid", ["$compile", "scopeConfigurator", "environment",
        function ($compile, scopeConfigurator, environment) {
            return {
                restrict: "E",
                scope: { element: "=" },
                controller: ["$scope", "$element",
                    function ($scope, $element) {
                        scopeConfigurator.configureForElement($scope, $element);
                        scopeConfigurator.configureForContainer($scope, $element);
                        $scope.sortableOptions["axis"] = "y";
                    }
                ],
                templateUrl: environment.templateUrl("Grid"),
                replace: true
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutRow", ["$compile", "scopeConfigurator", "environment",
        function ($compile, scopeConfigurator, environment) {
            return {
                restrict: "E",
                scope: { element: "=" },
                controller: ["$scope", "$element",
                    function ($scope, $element) {
                        scopeConfigurator.configureForElement($scope, $element);
                        scopeConfigurator.configureForContainer($scope, $element);
                        $scope.sortableOptions["axis"] = "x";
                        $scope.sortableOptions["ui-floating"] = true;
                    }
                ],
                templateUrl: environment.templateUrl("Row"),
                replace: true
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutPopup", [
        function () {
            return {
                restrict: "A",
                link: function (scope, element, attrs) {
                    var popup = $(element);
                    var trigger = popup.closest(".layout-popup-trigger");
                    var parentElement = popup.closest(".layout-element");
                    trigger.click(function () {
                        popup.toggle();
                        if (popup.is(":visible")) {
                            popup.position({
                                my: attrs.orcLayoutPopupMy || "left top",
                                at: attrs.orcLayoutPopupAt || "left bottom+4px",
                                of: trigger
                            });
                            popup.find("input").first().focus();
                        }
                    });
                    popup.click(function (e) {
                        e.stopPropagation();
                    });
                    parentElement.click(function (e) {
                        popup.hide();
                    });
                    popup.keydown(function (e) {
                        if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 27) // Esc
                            popup.hide();
                        e.stopPropagation();
                    });
                    popup.on("cut copy paste", function (e) {
                        // Allow clipboard operations in popup without invoking clipboard event handlers on parent element.
                        e.stopPropagation();
                    });
                }
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutToolbox", ["$compile", "environment",
        function ($compile, environment) {
            return {
                restrict: "E",
                controller: ["$scope", "$element",
                    function ($scope, $element) {

                        $scope.resetElements = function () {

                            $scope.gridElements = [
                                LayoutEditor.Grid.from({
                                    toolboxIcon: "\uf00a",
                                    toolboxLabel: "Grid",
                                    toolboxDescription: "Empty grid.",
                                    children: []
                                })
                            ];

                            $scope.rowElements = [
                                LayoutEditor.Row.from({
                                    toolboxIcon: "\uf0c9",
                                    toolboxLabel: "Row (1 column)",
                                    toolboxDescription: "Row with 1 column.",
                                    children: LayoutEditor.Column.times(1)
                                }),
                                LayoutEditor.Row.from({
                                    toolboxIcon: "\uf0c9",
                                    toolboxLabel: "Row (2 columns)",
                                    toolboxDescription: "Row with 2 columns.",
                                    children: LayoutEditor.Column.times(2)
                                }),
                                LayoutEditor.Row.from({
                                    toolboxIcon: "\uf0c9",
                                    toolboxLabel: "Row (3 columns)",
                                    toolboxDescription: "Row with 3 columns.",
                                    children: LayoutEditor.Column.times(3)
                                }),
                                LayoutEditor.Row.from({
                                    toolboxIcon: "\uf0c9",
                                    toolboxLabel: "Row (4 columns)",
                                    toolboxDescription: "Row with 4 columns.",
                                    children: LayoutEditor.Column.times(4)
                                }),
                                LayoutEditor.Row.from({
                                    toolboxIcon: "\uf0c9",
                                    toolboxLabel: "Row (6 columns)",
                                    toolboxDescription: "Row with 6 columns.",
                                    children: LayoutEditor.Column.times(6)
                                }),
                                LayoutEditor.Row.from({
                                    toolboxIcon: "\uf0c9",
                                    toolboxLabel: "Row (12 columns)",
                                    toolboxDescription: "Row with 12 columns.",
                                    children: LayoutEditor.Column.times(12)
                                }), LayoutEditor.Row.from({
                                    toolboxIcon: "\uf0c9",
                                    toolboxLabel: "Row (empty)",
                                    toolboxDescription: "Empty row.",
                                    children: []
                                })
                            ];

                            $scope.columnElements = [
                                LayoutEditor.Column.from({
                                    toolboxIcon: "\uf0db",
                                    toolboxLabel: "Column",
                                    toolboxDescription: "Empty column.",
                                    width: 1,
                                    offset: 0,
                                    children: []
                                })
                            ];

                            $scope.contentElementCategories = _($scope.element.config.categories).map(function (category) {
                                return {
                                    name: category.name,
                                    elements: _(category.contentTypes).map(function (contentType) {
                                        var type = contentType.type;
                                        var factory = LayoutEditor.factories[type] || LayoutEditor.factories["Content"];
                                        var item = {
                                            isTemplated: false,
                                            contentType: contentType.id,
                                            contentTypeLabel: contentType.label,
                                            contentTypeClass: contentType.typeClass,
                                            data: null,
                                            hasEditor: contentType.hasEditor,
                                            html: contentType.html
                                        };
                                        var element = factory(item);
                                        element.toolboxIcon = contentType.icon || "\uf1c9";
                                        element.toolboxLabel = contentType.label;
                                        element.toolboxDescription = contentType.description;
                                        return element;
                                    })
                                };
                            });

                        };

                        $scope.resetElements();

                        $scope.getSortableOptions = function (type) {
                            var editorId = $element.closest(".layout-editor").attr("id");
                            var parentClasses;
                            var placeholderClasses;
                            var floating = false;

                            switch (type) {
                                case "Grid":
                                    parentClasses = [".layout-canvas", ".layout-column", ".layout-common-holder"];
                                    placeholderClasses = "layout-element layout-container layout-grid ui-sortable-placeholder";
                                    break;
                                case "Row":
                                    parentClasses = [".layout-grid"];
                                    placeholderClasses = "layout-element layout-container layout-row row ui-sortable-placeholder";
                                    break;
                                case "Column":
                                    parentClasses = [".layout-row:not(.layout-row-full)"];
                                    placeholderClasses = "layout-element layout-container layout-column ui-sortable-placeholder";
                                    floating = true; // To ensure a smooth horizontal-list reordering. https://github.com/angular-ui/ui-sortable#floating
                                    break;
                                case "Content":
                                    parentClasses = [".layout-canvas", ".layout-column", ".layout-common-holder"];
                                    placeholderClasses = "layout-element layout-content ui-sortable-placeholder";
                                    break;
                            }

                            return {
                                cursor: "move",
                                connectWith: _(parentClasses).map(function (e) { return "#" + editorId + " " + e + ":not(.layout-container-sealed) > .layout-element-wrapper > .layout-children"; }).join(", "),
                                placeholder: placeholderClasses,
                                "ui-floating": floating,
                                create: function (e, ui) {
                                    e.target.isToolbox = true; // Will indicate to connected sortables that dropped items were sent from toolbox.
                                },
                                start: function (e, ui) {
                                    $scope.$apply(function () {
                                        $scope.element.isDragging = true;
                                    });
                                },
                                stop: function (e, ui) {
                                    $scope.$apply(function () {
                                        $scope.element.isDragging = false;
                                        $scope.resetElements();
                                    });
                                },
                                over: function (e, ui) {
                                    $scope.$apply(function () {
                                        $scope.element.canvas.setIsDropTarget(false);
                                    });
                                },
                            }
                        };

                        var layoutIsCollapsedCookieName = "layoutToolboxCategory_Layout_IsCollapsed";
                        $scope.layoutIsCollapsed = $.cookie(layoutIsCollapsedCookieName) === "true";

                        $scope.toggleLayoutIsCollapsed = function (e) {
                            $scope.layoutIsCollapsed = !$scope.layoutIsCollapsed;
                            $.cookie(layoutIsCollapsedCookieName, $scope.layoutIsCollapsed, { expires: 365 }); // Remember collapsed state for a year.
                            e.preventDefault();
                            e.stopPropagation();
                        };
                    }
                ],
                templateUrl: environment.templateUrl("Toolbox"),
                replace: true,
                link: function (scope, element) {
                    var toolbox = element.find(".layout-toolbox");
                    $(window).on("resize scroll", function (e) {
                        var canvas = element.parent().find(".layout-canvas");
                        // If the canvas is taller than the toolbox, make the toolbox sticky-positioned within the editor
                        // to help the user avoid excessive vertical scrolling.
                        var canvasIsTaller = !!canvas && canvas.height() > toolbox.height();
                        var windowPos = $(window).scrollTop();
                        if (canvasIsTaller && windowPos > element.offset().top + element.height() - toolbox.height()) {
                            toolbox.addClass("sticky-bottom");
                            toolbox.removeClass("sticky-top");
                        }
                        else if (canvasIsTaller && windowPos > element.offset().top) {
                            toolbox.addClass("sticky-top");
                            toolbox.removeClass("sticky-bottom");
                        }
                        else {
                            toolbox.removeClass("sticky-top");
                            toolbox.removeClass("sticky-bottom");
                        }
                    });
                }
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutToolboxGroup", ["$compile", "environment",
        function ($compile, environment) {
            return {
                restrict: "E",
                scope: { category: "=" },
                controller: ["$scope", "$element",
                    function ($scope, $element) {
                        var isCollapsedCookieName = "layoutToolboxCategory_" + $scope.category.name + "_IsCollapsed";
                        $scope.isCollapsed = $.cookie(isCollapsedCookieName) === "true";
                        $scope.toggleIsCollapsed = function (e) {
                            $scope.isCollapsed = !$scope.isCollapsed;
                            $.cookie(isCollapsedCookieName, $scope.isCollapsed, { expires: 365 }); // Remember collapsed state for a year.
                            e.preventDefault();
                            e.stopPropagation();
                        };
                    }
                ],
                templateUrl: environment.templateUrl("ToolboxGroup"),
                replace: true
            };
        }
    ]);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIk1vZHVsZS5qcyIsIkNsaXBib2FyZC5qcyIsIlNjb3BlQ29uZmlndXJhdG9yLmpzIiwiRWRpdG9yLmpzIiwiQ2FudmFzLmpzIiwiQ2hpbGQuanMiLCJDb2x1bW4uanMiLCJDb250ZW50LmpzIiwiSHRtbC5qcyIsIkdyaWQuanMiLCJSb3cuanMiLCJQb3B1cC5qcyIsIlRvb2xib3guanMiLCJUb29sYm94R3JvdXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiTGF5b3V0RWRpdG9yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhci5tb2R1bGUoXCJMYXlvdXRFZGl0b3JcIiwgW1wibmdTYW5pdGl6ZVwiLCBcIm5nUmVzb3VyY2VcIiwgXCJ1aS5zb3J0YWJsZVwiXSk7IiwidmFyIExheW91dEVkaXRvcjtcclxuKGZ1bmN0aW9uKExheW91dEVkaXRvcikge1xyXG5cclxuICAgIHZhciBDbGlwYm9hcmQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuX2NsaXBib2FyZERhdGEgPSB7fTtcclxuICAgICAgICB0aGlzLl9pc0Rpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5fd2FzSW52b2tlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICB0aGlzLnNldERhdGEgPSBmdW5jdGlvbihjb250ZW50VHlwZSwgZGF0YSkge1xyXG4gICAgICAgICAgICBzZWxmLl9jbGlwYm9hcmREYXRhW2NvbnRlbnRUeXBlXSA9IGRhdGE7XHJcbiAgICAgICAgICAgIHNlbGYuX3dhc0ludm9rZWQgPSB0cnVlO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5nZXREYXRhID0gZnVuY3Rpb24gKGNvbnRlbnRUeXBlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBzZWxmLl9jbGlwYm9hcmREYXRhW2NvbnRlbnRUeXBlXTtcclxuICAgICAgICAgICAgc2VsZi5fd2FzSW52b2tlZCA9IHRydWU7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLmRpc2FibGUgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2VsZi5faXNEaXNhYmxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIHNlbGYuX3dhc0ludm9rZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgc2VsZi5fY2xpcGJvYXJkRGF0YSA9IHt9O1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5pc0Rpc2FibGVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gc2VsZi5faXNEaXNhYmxlZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy53YXNJbnZva2VkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gc2VsZi5fd2FzSW52b2tlZDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgTGF5b3V0RWRpdG9yLkNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmQoKTtcclxuXHJcbiAgICBhbmd1bGFyXHJcbiAgICAgICAgLm1vZHVsZShcIkxheW91dEVkaXRvclwiKVxyXG4gICAgICAgIC5mYWN0b3J5KFwiY2xpcGJvYXJkXCIsIFtcclxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHNldERhdGE6IExheW91dEVkaXRvci5DbGlwYm9hcmQuc2V0RGF0YSxcclxuICAgICAgICAgICAgICAgICAgICBnZXREYXRhOiBMYXlvdXRFZGl0b3IuQ2xpcGJvYXJkLmdldERhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZTogTGF5b3V0RWRpdG9yLkNsaXBib2FyZC5kaXNhYmxlLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzRGlzYWJsZWQ6IExheW91dEVkaXRvci5DbGlwYm9hcmQuaXNEaXNhYmxlZCxcclxuICAgICAgICAgICAgICAgICAgICB3YXNJbnZva2VkOiBMYXlvdXRFZGl0b3IuQ2xpcGJvYXJkLndhc0ludm9rZWRcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICBdKTtcclxufSkoTGF5b3V0RWRpdG9yIHx8IChMYXlvdXRFZGl0b3IgPSB7fSkpOyIsImFuZ3VsYXJcclxuICAgIC5tb2R1bGUoXCJMYXlvdXRFZGl0b3JcIilcclxuICAgIC5mYWN0b3J5KFwic2NvcGVDb25maWd1cmF0b3JcIiwgW1wiJHRpbWVvdXRcIiwgXCJjbGlwYm9hcmRcIixcclxuICAgICAgICBmdW5jdGlvbiAoJHRpbWVvdXQsIGNsaXBib2FyZCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbmZpZ3VyZUZvckVsZW1lbnQ6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAkZWxlbWVudC5maW5kKFwiLmxheW91dC1wYW5lbFwiKS5jbGljayhmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoKS5rZXlkb3duKGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBoYW5kbGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNldEZvY3VzID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBlbGVtZW50ID0gJHNjb3BlLmVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmVkaXRvci5pc0RyYWdnaW5nIHx8IGVsZW1lbnQuZWRpdG9yLmlubGluZUVkaXRpbmdJc0FjdGl2ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIG5hdGl2ZSBjbGlwYm9hcmQgc3VwcG9ydCBleGlzdHMsIHRoZSBwc2V1ZG8tY2xpcGJvYXJkIHdpbGwgaGF2ZSBiZWVuIGRpc2FibGVkLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNsaXBib2FyZC5pc0Rpc2FibGVkKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmb2N1c2VkRWxlbWVudCA9IGVsZW1lbnQuZWRpdG9yLmZvY3VzZWRFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhZm9jdXNlZEVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQc2V1ZG8gY2xpcGJvYXJkIGhhbmRsaW5nIGZvciBicm93c2VycyBub3QgYWxsb3dpbmcgcmVhbCBjbGlwYm9hcmQgb3BlcmF0aW9ucy5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZS5jdHJsS2V5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoZS53aGljaCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDY3OiAvLyBDXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb2N1c2VkRWxlbWVudC5jb3B5KGNsaXBib2FyZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSA4ODogLy8gWFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9jdXNlZEVsZW1lbnQuY3V0KGNsaXBib2FyZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSA4NjogLy8gVlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9jdXNlZEVsZW1lbnQucGFzdGUoY2xpcGJvYXJkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWUuY3RybEtleSAmJiAhZS5zaGlmdEtleSAmJiAhZS5hbHRLZXkgJiYgZS53aGljaCA9PSA0NikgeyAvLyBEZWxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5kZWxldGUoZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICghZS5jdHJsS2V5ICYmICFlLnNoaWZ0S2V5ICYmICFlLmFsdEtleSAmJiAoZS53aGljaCA9PSAzMiB8fCBlLndoaWNoID09IDI3KSkgeyAvLyBTcGFjZSBvciBFc2NcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRlbGVtZW50LmZpbmQoXCIubGF5b3V0LXBhbmVsLWFjdGlvbi1wcm9wZXJ0aWVzXCIpLmZpcnN0KCkuY2xpY2soKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC50eXBlID09IFwiQ29udGVudFwiKSB7IC8vIFRoaXMgaXMgYSBjb250ZW50IGVsZW1lbnQuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWUuY3RybEtleSAmJiAhZS5zaGlmdEtleSAmJiAhZS5hbHRLZXkgJiYgZS53aGljaCA9PSAxMykgeyAvLyBFbnRlclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRlbGVtZW50LmZpbmQoXCIubGF5b3V0LXBhbmVsLWFjdGlvbi1lZGl0XCIpLmZpcnN0KCkuY2xpY2soKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhZWxlbWVudC5jaGlsZHJlbikgeyAvLyBUaGlzIGlzIGEgY29udGFpbmVyLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlLmN0cmxLZXkgJiYgIWUuc2hpZnRLZXkgJiYgZS5hbHRLZXkgJiYgZS53aGljaCA9PSA0MCkgeyAvLyBBbHQrRG93blxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmNoaWxkcmVuLmxlbmd0aCA+IDApXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY2hpbGRyZW5bMF0uc2V0SXNGb2N1c2VkKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQudHlwZSA9PSBcIkNvbHVtblwiKSB7IC8vIFRoaXMgaXMgYSBjb2x1bW4uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbm5lY3RBZGphY2VudCA9ICFlLmN0cmxLZXk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUud2hpY2ggPT0gMzcpIHsgLy8gTGVmdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZS5hbHRLZXkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmV4cGFuZExlZnQoY29ubmVjdEFkamFjZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUuc2hpZnRLZXkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmNvbnRyYWN0UmlnaHQoY29ubmVjdEFkamFjZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlLndoaWNoID09IDM5KSB7IC8vIFJpZ2h0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlLmFsdEtleSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY29udHJhY3RMZWZ0KGNvbm5lY3RBZGphY2VudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlLnNoaWZ0S2V5KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5leHBhbmRSaWdodChjb25uZWN0QWRqYWNlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIWVsZW1lbnQucGFyZW50KSB7IC8vIFRoaXMgaXMgYSBjaGlsZC5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlLmFsdEtleSAmJiBlLndoaWNoID09IDM4KSB7IC8vIEFsdCtVcFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQucGFyZW50LnNldElzRm9jdXNlZCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LnBhcmVudC50eXBlID09IFwiUm93XCIpIHsgLy8gUGFyZW50IGlzIGEgaG9yaXpvbnRhbCBjb250YWluZXIuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlLmN0cmxLZXkgJiYgIWUuc2hpZnRLZXkgJiYgIWUuYWx0S2V5ICYmIGUud2hpY2ggPT0gMzcpIHsgLy8gTGVmdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnBhcmVudC5tb3ZlRm9jdXNQcmV2Q2hpbGQoZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICghZS5jdHJsS2V5ICYmICFlLnNoaWZ0S2V5ICYmICFlLmFsdEtleSAmJiBlLndoaWNoID09IDM5KSB7IC8vIFJpZ2h0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQucGFyZW50Lm1vdmVGb2N1c05leHRDaGlsZChlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGUuY3RybEtleSAmJiAhZS5zaGlmdEtleSAmJiAhZS5hbHRLZXkgJiYgZS53aGljaCA9PSAzNykgeyAvLyBDdHJsK0xlZnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5tb3ZlVXAoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzZXRGb2N1cyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChlLmN0cmxLZXkgJiYgIWUuc2hpZnRLZXkgJiYgIWUuYWx0S2V5ICYmIGUud2hpY2ggPT0gMzkpIHsgLy8gQ3RybCtSaWdodFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lm1vdmVEb3duKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgeyAvLyBQYXJlbnQgaXMgYSB2ZXJ0aWNhbCBjb250YWluZXIuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlLmN0cmxLZXkgJiYgIWUuc2hpZnRLZXkgJiYgIWUuYWx0S2V5ICYmIGUud2hpY2ggPT0gMzgpIHsgLy8gVXBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5wYXJlbnQubW92ZUZvY3VzUHJldkNoaWxkKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoIWUuY3RybEtleSAmJiAhZS5zaGlmdEtleSAmJiAhZS5hbHRLZXkgJiYgZS53aGljaCA9PSA0MCkgeyAvLyBEb3duXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQucGFyZW50Lm1vdmVGb2N1c05leHRDaGlsZChlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGUuY3RybEtleSAmJiAhZS5zaGlmdEtleSAmJiAhZS5hbHRLZXkgJiYgZS53aGljaCA9PSAzOCkgeyAvLyBDdHJsK1VwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQubW92ZVVwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc2V0Rm9jdXMgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoZS5jdHJsS2V5ICYmICFlLnNoaWZ0S2V5ICYmICFlLmFsdEtleSAmJiBlLndoaWNoID09IDQwKSB7IC8vIEN0cmwrRG93blxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lm1vdmVEb3duKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhhbmRsZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoKTsgLy8gRXZlbnQgaXMgbm90IHRyaWdnZXJlZCBieSBBbmd1bGFyIGRpcmVjdGl2ZSBidXQgcmF3IGV2ZW50IGhhbmRsZXIgb24gZWxlbWVudC5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhBQ0s6IFdvcmthcm91bmQgYmVjYXVzZSBvZiBob3cgQW5ndWxhciB0cmVhdHMgdGhlIERPTSB3aGVuIGVsZW1lbnRzIGFyZSBzaGlmdGVkIGFyb3VuZCAtIGlucHV0IGZvY3VzIGlzIHNvbWV0aW1lcyBsb3N0LlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzZXRGb2N1cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmVkaXRvci5mb2N1c2VkRWxlbWVudC5zZXRJc0ZvY3VzZWQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVsZW1lbnQuc2V0SXNGb2N1c2VkRXZlbnRIYW5kbGVycy5wdXNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCkuZm9jdXMoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmRlbGV0ZSA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuZGVsZXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgICAgICBjb25maWd1cmVGb3JDb250YWluZXI6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSAkc2NvcGUuZWxlbWVudDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8kc2NvcGUuaXNSZWNlaXZpbmcgPSBmYWxzZTsgLy8gVHJ1ZSB3aGVuIGNvbnRhaW5lciBpcyByZWNlaXZpbmcgYW4gZXh0ZXJuYWwgZWxlbWVudCB2aWEgZHJhZy9kcm9wLlxyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5nZXRTaG93Q2hpbGRyZW5QbGFjZWhvbGRlciA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS5lbGVtZW50LmNoaWxkcmVuLmxlbmd0aCA9PT0gMCAmJiAhJHNjb3BlLmVsZW1lbnQuZ2V0SXNEcm9wVGFyZ2V0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNvcnRhYmxlT3B0aW9ucyA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3Vyc29yOiBcIm1vdmVcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVsYXk6IDE1MCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IGVsZW1lbnQuZ2V0SXNTZWFsZWQoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzdGFuY2U6IDUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vaGFuZGxlOiBlbGVtZW50LmNoaWxkcmVuLmxlbmd0aCA8IDIgPyBcIi5pbWFnaW5hcnktY2xhc3NcIiA6IGZhbHNlLCAvLyBGb3Igc29tZSByZWFzb24gZG9lc24ndCBnZXQgcmUtZXZhbHVhdGVkIGFmdGVyIGFkZGluZyBtb3JlIGNoaWxkcmVuLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogZnVuY3Rpb24gKGUsIHVpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnNldElzRHJvcFRhcmdldCh0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmVkaXRvci5pc0RyYWdnaW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWFrZSB0aGUgZHJvcCB0YXJnZXQgcGxhY2Vob2xkZXIgYXMgaGlnaCBhcyB0aGUgaXRlbSBiZWluZyBkcmFnZ2VkLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdWkucGxhY2Vob2xkZXIuaGVpZ2h0KHVpLml0ZW0uaGVpZ2h0KCkgLSA0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVpLnBsYWNlaG9sZGVyLmNzcyhcIm1pbi1oZWlnaHRcIiwgMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0b3A6IGZ1bmN0aW9uIChlLCB1aSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5lZGl0b3IuaXNEcmFnZ2luZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc2V0SXNEcm9wVGFyZ2V0KGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvdmVyOiBmdW5jdGlvbiAoZSwgdWkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIXVpLnNlbmRlciAmJiAhIXVpLnNlbmRlclswXS5pc1Rvb2xib3gpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoISF1aS5zZW5kZXJbMF0uZHJvcFRhcmdldFRpbWVvdXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHVpLnNlbmRlclswXS5kcm9wVGFyZ2V0VGltZW91dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVpLnNlbmRlclswXS5kcm9wVGFyZ2V0VGltZW91dCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQudHlwZSA9PSBcIlJvd1wiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGVyZSB3YXMgYSBwcmV2aW91cyBkcm9wIHRhcmdldCBhbmQgaXQgd2FzIGEgcm93LCByb2xsIGJhY2sgYW55IHBlbmRpbmcgY29sdW1uIGFkZHMgdG8gaXQuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcHJldmlvdXNEcm9wVGFyZ2V0ID0gZWxlbWVudC5lZGl0b3IuZHJvcFRhcmdldEVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoISFwcmV2aW91c0Ryb3BUYXJnZXQgJiYgcHJldmlvdXNEcm9wVGFyZ2V0LnR5cGUgPT0gXCJSb3dcIilcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2aW91c0Ryb3BUYXJnZXQucm9sbGJhY2tBZGRDb2x1bW4oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnNldElzRHJvcFRhcmdldChmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdWkuc2VuZGVyWzBdLmRyb3BUYXJnZXRUaW1lb3V0ID0gJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC50eXBlID09IFwiUm93XCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZWNlaXZlZENvbHVtbiA9IHVpLml0ZW0uc29ydGFibGUubW9kZWw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVjZWl2ZWRDb2x1bW5XaWR0aCA9IE1hdGguZmxvb3IoMTIgLyAoZWxlbWVudC5jaGlsZHJlbi5sZW5ndGggKyAxKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNlaXZlZENvbHVtbi53aWR0aCA9IHJlY2VpdmVkQ29sdW1uV2lkdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNlaXZlZENvbHVtbi5vZmZzZXQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5iZWdpbkFkZENvbHVtbihyZWNlaXZlZENvbHVtbldpZHRoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1ha2UgdGhlIGRyb3AgdGFyZ2V0IHBsYWNlaG9sZGVyIHRoZSBjb3JyZWN0IHdpZHRoIGFuZCBhcyBoaWdoIGFzIHRoZSBoaWdoZXN0IGV4aXN0aW5nIGNvbHVtbiBpbiB0aGUgcm93LlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1heEhlaWdodCA9IF8ubWF4KF8oJGVsZW1lbnQuZmluZChcIj4gLmxheW91dC1jaGlsZHJlbiA+IC5sYXlvdXQtY29sdW1uOm5vdCgudWktc29ydGFibGUtcGxhY2Vob2xkZXIpXCIpKS5tYXAoZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJChlKS5oZWlnaHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDE7IGkgPD0gMTI7IGkrKylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1aS5wbGFjZWhvbGRlci5yZW1vdmVDbGFzcyhcImNvbC14cy1cIiArIGkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdWkucGxhY2Vob2xkZXIuYWRkQ2xhc3MoXCJjb2wteHMtXCIgKyByZWNlaXZlZENvbHVtbi53aWR0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWF4SGVpZ2h0ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVpLnBsYWNlaG9sZGVyLmhlaWdodChtYXhIZWlnaHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVpLnBsYWNlaG9sZGVyLmNzcyhcIm1pbi1oZWlnaHRcIiwgMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1aS5wbGFjZWhvbGRlci5oZWlnaHQoMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdWkucGxhY2Vob2xkZXIuY3NzKFwibWluLWhlaWdodFwiLCBcIlwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnNldElzRHJvcFRhcmdldCh0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAxNTApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWNlaXZlOiBmdW5jdGlvbiAoZSwgdWkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIXVpLnNlbmRlciAmJiAhIXVpLnNlbmRlclswXS5pc1Rvb2xib3gpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlY2VpdmVkRWxlbWVudCA9IHVpLml0ZW0uc29ydGFibGUubW9kZWw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIXJlY2VpdmVkRWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQudHlwZSA9PSBcIlJvd1wiKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY29tbWl0QWRkQ29sdW1uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTaG91bGQgaWRlYWxseSBjYWxsIExheW91dEVkaXRvci5Db250YWluZXIuYWRkQ2hpbGQoKSBpbnN0ZWFkLCBidXQgc2luY2UgdGhpcyBoYW5kbGVyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpcyBydW4gKmJlZm9yZSogdGhlIHVpLXNvcnRhYmxlIGRpcmVjdGl2ZSdzIGhhbmRsZXIsIGlmIHdlIHRyeSB0byBhZGQgdGhlIGNoaWxkIHRvIHRoZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXJyYXkgdGhhdCBoYW5kbGVyIHdpbGwgZ2V0IGFuIGV4Y2VwdGlvbiB3aGVuIHRyeWluZyB0byBkbyB0aGUgc2FtZS5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEJlY2F1c2Ugb2YgdGhpcywgd2UgbmVlZCB0byBpbnZva2UgXCJzZXRQYXJlbnRcIiBzbyB0aGF0IHNwZWNpZmljIGNvbnRhaW5lciB0eXBlcyBjYW4gcGVyZm9ybSBlbGVtZW50IHNwZWZpY2ljIGluaXRpYWxpemF0aW9uLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZWRFbGVtZW50LnNldEVkaXRvcihlbGVtZW50LmVkaXRvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNlaXZlZEVsZW1lbnQuc2V0UGFyZW50KGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhcmVjZWl2ZWRFbGVtZW50Lmhhc0VkaXRvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kcm9vdC5lZGl0RWxlbWVudChyZWNlaXZlZEVsZW1lbnQpLnRoZW4oZnVuY3Rpb24gKGFyZ3MpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFhcmdzLmNhbmNlbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZWRFbGVtZW50LmRhdGEgPSBhcmdzLmVsZW1lbnQuZGF0YTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVjZWl2ZWRFbGVtZW50LnNldEh0bWwpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZWRFbGVtZW50LnNldEh0bWwoYXJncy5lbGVtZW50Lmh0bWwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIWFyZ3MuY2FuY2VsKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY2VpdmVkRWxlbWVudC5kZWxldGUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNlaXZlZEVsZW1lbnQuc2V0SXNGb2N1c2VkKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyRzY29wZS5pc1JlY2VpdmluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zZXRJc0Ryb3BUYXJnZXQoZmFsc2UpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyRzY29wZS5pc1JlY2VpdmluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zZXRJc0Ryb3BUYXJnZXQoZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhcmVjZWl2ZWRFbGVtZW50KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY2VpdmVkRWxlbWVudC5zZXRJc0ZvY3VzZWQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY2xpY2sgPSBmdW5jdGlvbiAoY2hpbGQsIGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjaGlsZC5lZGl0b3IuaXNEcmFnZ2luZylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkLnNldElzRm9jdXNlZCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5nZXRDbGFzc2VzID0gZnVuY3Rpb24gKGNoaWxkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBbXCJsYXlvdXQtZWxlbWVudFwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIWNoaWxkLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChcImxheW91dC1jb250YWluZXJcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hpbGQuZ2V0SXNTZWFsZWQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChcImxheW91dC1jb250YWluZXItc2VhbGVkXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChcImxheW91dC1cIiArIGNoaWxkLnR5cGUudG9Mb3dlckNhc2UoKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoISFjaGlsZC5kcm9wVGFyZ2V0Q2xhc3MpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChjaGlsZC5kcm9wVGFyZ2V0Q2xhc3MpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVE9ETzogTW92ZSB0aGVzZSB0byBlaXRoZXIgdGhlIENvbHVtbiBkaXJlY3RpdmUgb3IgdGhlIENvbHVtbiBtb2RlbCBjbGFzcy5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoaWxkLnR5cGUgPT0gXCJSb3dcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goXCJyb3dcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNoaWxkLmNhbkFkZENvbHVtbigpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwibGF5b3V0LXJvdy1mdWxsXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGlsZC50eXBlID09IFwiQ29sdW1uXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwiY29sLXhzLVwiICsgY2hpbGQud2lkdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goXCJjb2wteHMtb2Zmc2V0LVwiICsgY2hpbGQub2Zmc2V0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hpbGQudHlwZSA9PSBcIkNvbnRlbnRcIilcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwibGF5b3V0LWNvbnRlbnQtXCIgKyBjaGlsZC5jb250ZW50VHlwZUNsYXNzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGlsZC5nZXRJc0FjdGl2ZSgpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goXCJsYXlvdXQtZWxlbWVudC1hY3RpdmVcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGlsZC5nZXRJc0ZvY3VzZWQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwibGF5b3V0LWVsZW1lbnQtZm9jdXNlZFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoaWxkLmdldElzU2VsZWN0ZWQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwibGF5b3V0LWVsZW1lbnQtc2VsZWN0ZWRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGlsZC5nZXRJc0Ryb3BUYXJnZXQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwibGF5b3V0LWVsZW1lbnQtZHJvcHRhcmdldFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoaWxkLmlzVGVtcGxhdGVkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goXCJsYXlvdXQtZWxlbWVudC10ZW1wbGF0ZWRcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgXSk7IiwiYW5ndWxhclxyXG4gICAgLm1vZHVsZShcIkxheW91dEVkaXRvclwiKVxyXG4gICAgLmRpcmVjdGl2ZShcIm9yY0xheW91dEVkaXRvclwiLCBbXCJlbnZpcm9ubWVudFwiLFxyXG4gICAgICAgIGZ1bmN0aW9uIChlbnZpcm9ubWVudCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6IFwiRVwiLFxyXG4gICAgICAgICAgICAgICAgc2NvcGU6IHt9LFxyXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiJGVsZW1lbnRcIiwgXCIkYXR0cnNcIiwgXCIkY29tcGlsZVwiLCBcImNsaXBib2FyZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMsICRjb21waWxlLCBjbGlwYm9hcmQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhJGF0dHJzLm1vZGVsKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVsZW1lbnQgPSBldmFsKCRhdHRycy5tb2RlbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSAnbW9kZWwnIGF0dHJpYnV0ZSBtdXN0IGV2YWx1YXRlIHRvIGEgTGF5b3V0RWRpdG9yLkVkaXRvciBvYmplY3QuXCIpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNsaWNrID0gZnVuY3Rpb24gKGNhbnZhcywgZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjYW52YXMuZWRpdG9yLmlzRHJhZ2dpbmcpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FudmFzLnNldElzRm9jdXNlZCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5nZXRDbGFzc2VzID0gZnVuY3Rpb24gKGNhbnZhcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IFtcImxheW91dC1lbGVtZW50XCIsIFwibGF5b3V0LWNvbnRhaW5lclwiLCBcImxheW91dC1jYW52YXNcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbnZhcy5nZXRJc0FjdGl2ZSgpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwibGF5b3V0LWVsZW1lbnQtYWN0aXZlXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbnZhcy5nZXRJc0ZvY3VzZWQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChcImxheW91dC1lbGVtZW50LWZvY3VzZWRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FudmFzLmdldElzU2VsZWN0ZWQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChcImxheW91dC1lbGVtZW50LXNlbGVjdGVkXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbnZhcy5nZXRJc0Ryb3BUYXJnZXQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChcImxheW91dC1lbGVtZW50LWRyb3B0YXJnZXRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FudmFzLmlzVGVtcGxhdGVkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwibGF5b3V0LWVsZW1lbnQtdGVtcGxhdGVkXCIpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBbiB1bmZvcnR1bmF0ZSBzaWRlLWVmZmVjdCBvZiB0aGUgbmV4dCBoYWNrIG9uIGxpbmUgNTQgaXMgdGhhdCB0aGUgY3JlYXRlZCBlbGVtZW50cyBhcmVuJ3QgYWRkZWQgdG8gdGhlIERPTSB5ZXQsIHNvIHdlIGNhbid0IHVzZSBpdCB0byBnZXQgdG8gdGhlIHBhcmVudCBcIi5sYXlvdXQtZGVzaWdlclwiIGVsZW1lbnQuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdvcmsgYXJvdW5kOiBhY2Nlc3MgdGhhdCBlbGVtZW50IGRpcmVjdGx5ICh3aGljaCBlZmVjdGl2ZWx5IHR1cm5zIG11bHRpcGxlIGxheW91dCBlZGl0b3JzIG9uIGEgc2luZ2xlIHBhZ2UgaW1wb3NzaWJsZSkuIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAvL3ZhciBsYXlvdXREZXNpZ25lckhvc3QgPSAkZWxlbWVudC5jbG9zZXN0KFwiLmxheW91dC1kZXNpZ25lclwiKS5kYXRhKFwibGF5b3V0LWRlc2lnbmVyLWhvc3RcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsYXlvdXREZXNpZ25lckhvc3QgPSAkKFwiLmxheW91dC1kZXNpZ25lclwiKS5kYXRhKFwibGF5b3V0LWRlc2lnbmVyLWhvc3RcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJHJvb3QubGF5b3V0RGVzaWduZXJIb3N0ID0gbGF5b3V0RGVzaWduZXJIb3N0O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgbGF5b3V0RGVzaWduZXJIb3N0LmVsZW1lbnQub24oXCJyZXBsYWNlY2FudmFzXCIsIGZ1bmN0aW9uIChlLCBhcmdzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZWRpdG9yID0gJHNjb3BlLmVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2FudmFzRGF0YSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBhcmdzLmNhbnZhcy5kYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWxJZDogYXJncy5jYW52YXMuaHRtbElkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWxDbGFzczogYXJncy5jYW52YXMuaHRtbENsYXNzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWxTdHlsZTogYXJncy5jYW52YXMuaHRtbFN0eWxlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzVGVtcGxhdGVkOiBhcmdzLmNhbnZhcy5pc1RlbXBsYXRlZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogYXJncy5jYW52YXMuY2hpbGRyZW5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSEFDSzogSW5zdGVhZCBvZiBzaW1wbHkgdXBkYXRpbmcgdGhlICRzY29wZS5lbGVtZW50IHdpdGggYSBuZXcgaW5zdGFuY2UsIHdlIG5lZWQgdG8gcmVwbGFjZSB0aGUgZW50aXJlIG9yYy1sYXlvdXQtZWRpdG9yIG1hcmt1cFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW4gb3JkZXIgZm9yIGFuZ3VsYXIgdG8gcmViaW5kIHN0YXJ0aW5nIHdpdGggdGhlIENhbnZhcyBlbGVtZW50LiBPdGhlcndpc2UsIGZvciBzb21lIHJlYXNvbiwgaXQgd2lsbCByZWJpbmQgc3RhcnRpbmcgd2l0aCB0aGUgZmlyc3QgY2hpbGQgb2YgQ2FudmFzLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gWW91IGNhbiBzZWUgdGhpcyBoYXBwZW5pbmcgd2hlbiBzZXR0aW5nIGEgYnJlYWtwb2ludCBpbiBTY29wZUNvbmZpZ3VyYXRvciB3aGVyZSBjb250YWluZXJzIGFyZSBpbml0aWFsaXplZCB3aXRoIGRyYWcgJiBkcm9wOiBvbiBwYWdlIGxvYWQsIHRoZSBmaXJzdCBlbGVtZW50XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpcyBhIENhbnZhcyAoZ29vZCksIGJ1dCBhZnRlciBoYXZpbmcgc2VsZWN0ZWQgYW5vdGhlciB0ZW1wbGF0ZSwgdGhlIGZpcnN0IGVsZW1lbnQgaXMgKHR5cGljYWxseSkgYSBHcmlkIChiYWQpLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2ltcGx5IHJlY29tcGlsaW5nIHRoZSBvcmMtbGF5b3V0LWVkaXRvciBkaXJlY3RpdmUgd2lsbCBjYXVzZSB0aGUgZW50aXJlIHRoaW5nIHRvIGJlIGdlbmVyYXRlZCwgd2hpY2ggd29ya3MganVzdCBmaW5lIGFzIHdlbGwgKGV2ZW4gdGhvdWdoIG5vdCBpcyBuaWNlIGFzIHNpbXBseSBsZXZlcmFnaW5nIG1vZGVsIGJpbmRpbmcpLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF5b3V0RGVzaWduZXJIb3N0LmVkaXRvciA9IHdpbmRvdy5sYXlvdXRFZGl0b3IgPSBuZXcgTGF5b3V0RWRpdG9yLkVkaXRvcihlZGl0b3IuY29uZmlnLCBjYW52YXNEYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0ZW1wbGF0ZSA9IFwiPG9yYy1sYXlvdXQtZWRpdG9yXCIgKyBcIiBtb2RlbD0nd2luZG93LmxheW91dEVkaXRvcicgLz5cIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBodG1sID0gJGNvbXBpbGUodGVtcGxhdGUpKCRzY29wZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKFwiLmxheW91dC1lZGl0b3ItaG9sZGVyXCIpLmh0bWwoaHRtbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRyb290LmVkaXRFbGVtZW50ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBob3N0ID0gJHNjb3BlLiRyb290LmxheW91dERlc2lnbmVySG9zdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBob3N0LmVkaXRFbGVtZW50KGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRyb290LmFkZEVsZW1lbnQgPSBmdW5jdGlvbiAoY29udGVudFR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBob3N0ID0gJHNjb3BlLiRyb290LmxheW91dERlc2lnbmVySG9zdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBob3N0LmFkZEVsZW1lbnQoY29udGVudFR5cGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnRvZ2dsZUlubGluZUVkaXRpbmcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoISRzY29wZS5lbGVtZW50LmlubGluZUVkaXRpbmdJc0FjdGl2ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbGVtZW50LmlubGluZUVkaXRpbmdJc0FjdGl2ZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGVsZW1lbnQuZmluZChcIi5sYXlvdXQtdG9vbGJhci1jb250YWluZXJcIikuc2hvdygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzZWxlY3RvciA9IFwiI2xheW91dC1lZGl0b3ItXCIgKyAkc2NvcGUuJGlkICsgXCIgLmxheW91dC1odG1sIC5sYXlvdXQtY29udGVudC1tYXJrdXBbZGF0YS10ZW1wbGF0ZWQ9ZmFsc2VdXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZpcnN0Q29udGVudEVkaXRvcklkID0gJChzZWxlY3RvcikuZmlyc3QoKS5hdHRyKFwiaWRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGlueW1jZS5pbml0KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdG9yLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGVtZTogXCJtb2Rlcm5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NoZW1hOiBcImh0bWw1XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsdWdpbnM6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiYWR2bGlzdCBhdXRvbGluayBsaXN0cyBsaW5rIGltYWdlIGNoYXJtYXAgcHJpbnQgcHJldmlldyBociBhbmNob3IgcGFnZWJyZWFrXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInNlYXJjaHJlcGxhY2Ugd29yZGNvdW50IHZpc3VhbGJsb2NrcyB2aXN1YWxjaGFycyBjb2RlIGZ1bGxzY3JlZW5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiaW5zZXJ0ZGF0ZXRpbWUgbWVkaWEgbm9uYnJlYWtpbmcgdGFibGUgY29udGV4dG1lbnUgZGlyZWN0aW9uYWxpdHlcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZW1vdGljb25zIHRlbXBsYXRlIHBhc3RlIHRleHRjb2xvciBjb2xvcnBpY2tlciB0ZXh0cGF0dGVyblwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJmdWxsc2NyZWVuIGF1dG9yZXNpemVcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYmFyOiBcInVuZG8gcmVkbyBjdXQgY29weSBwYXN0ZSB8IGJvbGQgaXRhbGljIHwgYnVsbGlzdCBudW1saXN0IG91dGRlbnQgaW5kZW50IGZvcm1hdHNlbGVjdCB8IGFsaWdubGVmdCBhbGlnbmNlbnRlciBhbGlnbnJpZ2h0IGFsaWduanVzdGlmeSBsdHIgcnRsIHwgbGluayB1bmxpbmsgY2hhcm1hcCB8IGNvZGUgZnVsbHNjcmVlbiBjbG9zZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb252ZXJ0X3VybHM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZF9lbGVtZW50czogXCIqWypdXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNob3VsZG4ndCBiZSBuZWVkZWQgZHVlIHRvIHRoZSB2YWxpZF9lbGVtZW50cyBzZXR0aW5nLCBidXQgVGlueU1DRSB3b3VsZCBzdHJpcCBzY3JpcHQuc3JjIHdpdGhvdXQgaXQuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuZGVkX3ZhbGlkX2VsZW1lbnRzOiBcInNjcmlwdFt0eXBlfGRlZmVyfHNyY3xsYW5ndWFnZV1cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzYmFyOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2tpbjogXCJvcmNoYXJkbGlnaHRncmF5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlubGluZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZml4ZWRfdG9vbGJhcl9jb250YWluZXI6IFwiI2xheW91dC1lZGl0b3ItXCIgKyAkc2NvcGUuJGlkICsgXCIgLmxheW91dC10b29sYmFyLWNvbnRhaW5lclwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbml0X2luc3RhbmNlX2NhbGxiYWNrOiBmdW5jdGlvbiAoZWRpdG9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWRpdG9yLmlkID09IGZpcnN0Q29udGVudEVkaXRvcklkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbnltY2UuZXhlY0NvbW1hbmQoXCJtY2VGb2N1c1wiLCBmYWxzZSwgZWRpdG9yLmlkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGlueW1jZS5yZW1vdmUoXCIjbGF5b3V0LWVkaXRvci1cIiArICRzY29wZS4kaWQgKyBcIiAubGF5b3V0LWNvbnRlbnQtbWFya3VwXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRlbGVtZW50LmZpbmQoXCIubGF5b3V0LXRvb2xiYXItY29udGFpbmVyXCIpLmhpZGUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5pbmxpbmVFZGl0aW5nSXNBY3RpdmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLm9uKFwiY3V0IGNvcHkgcGFzdGVcIiwgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIHRoZSBwc2V1ZG8gY2xpcGJvYXJkIHdhcyBhbHJlYWR5IGludm9rZWQgKHdoaWNoIGhhcHBlbnMgb24gdGhlIGZpcnN0IGNsaXBib2FyZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb3BlcmF0aW9uIGFmdGVyIHBhZ2UgbG9hZCBldmVuIGlmIG5hdGl2ZSBjbGlwYm9hcmQgc3VwcG9ydCBleGlzdHMpIHRoZW4gc2l0IHRoaXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9uZSBvcGVyYXRpb24gb3V0LCBidXQgbWFrZSBzdXJlIHdoYXRldmVyIGlzIG9uIHRoZSBwc2V1ZG8gY2xpcGJvYXJkIGdldHMgbWlncmF0ZWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRvIHRoZSBuYXRpdmUgY2xpcGJvYXJkIGZvciBzdWJzZXF1ZW50IG9wZXJhdGlvbnMuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xpcGJvYXJkLndhc0ludm9rZWQoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhLnNldERhdGEoXCJ0ZXh0L3BsYWluXCIsIGNsaXBib2FyZC5nZXREYXRhKFwidGV4dC9wbGFpblwiKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuc2V0RGF0YShcInRleHQvanNvblwiLCBjbGlwYm9hcmQuZ2V0RGF0YShcInRleHQvanNvblwiKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZvY3VzZWRFbGVtZW50ID0gJHNjb3BlLmVsZW1lbnQuZm9jdXNlZEVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhZm9jdXNlZEVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGUudHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjb3B5XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzZWRFbGVtZW50LmNvcHkoZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiY3V0XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzZWRFbGVtZW50LmN1dChlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJwYXN0ZVwiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb2N1c2VkRWxlbWVudC5wYXN0ZShlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhBQ0s6IFdvcmthcm91bmQgYmVjYXVzZSBvZiBob3cgQW5ndWxhciB0cmVhdHMgdGhlIERPTSB3aGVuIGVsZW1lbnRzIGFyZSBzaGlmdGVkIGFyb3VuZCAtIGlucHV0IGZvY3VzIGlzIHNvbWV0aW1lcyBsb3N0LlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoISEkc2NvcGUuZWxlbWVudC5mb2N1c2VkRWxlbWVudClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVsZW1lbnQuZm9jdXNlZEVsZW1lbnQuc2V0SXNGb2N1c2VkKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTmF0aXZlIGNsaXBib2FyZCBzdXBwb3J0IG9idmlvdXNseSBleGlzdHMsIHNvIGRpc2FibGUgdGhlIHBldWRvIGNsaXBib2FyZCBmcm9tIG5vdyBvbi5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaXBib2FyZC5kaXNhYmxlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogZW52aXJvbm1lbnQudGVtcGxhdGVVcmwoXCJFZGl0b3JcIiksXHJcbiAgICAgICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gTm8gY2xpY2tzIHNob3VsZCBwcm9wYWdhdGUgZnJvbSB0aGUgVGlueU1DRSB0b29sYmFycy5cclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmZpbmQoXCIubGF5b3V0LXRvb2xiYXItY29udGFpbmVyXCIpLmNsaWNrKGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gSW50ZXJjZXB0IG1vdXNlZG93biBvbiBlZGl0b3Igd2hpbGUgaW4gaW5saW5lIGVkaXRpbmcgbW9kZSB0byBcclxuICAgICAgICAgICAgICAgICAgICAvLyBwcmV2ZW50IGN1cnJlbnQgZWRpdG9yIGZyb20gbG9zaW5nIGZvY3VzLlxyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQubW91c2Vkb3duKGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzY29wZS5lbGVtZW50LmlubGluZUVkaXRpbmdJc0FjdGl2ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVW5mb2N1cyBhbmQgdW5zZWxlY3QgZXZlcnl0aGluZyBvbiBjbGljayBvdXRzaWRlIG9mIGNhbnZhcy5cclxuICAgICAgICAgICAgICAgICAgICAkKHdpbmRvdykuY2xpY2soZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRXhjZXB0IHdoZW4gaW4gaW5saW5lIGVkaXRpbmcgbW9kZS5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFzY29wZS5lbGVtZW50LmlubGluZUVkaXRpbmdJc0FjdGl2ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5lbGVtZW50LmFjdGl2ZUVsZW1lbnQgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmVsZW1lbnQuZm9jdXNlZEVsZW1lbnQgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICBdKTsiLCJhbmd1bGFyXHJcbiAgICAubW9kdWxlKFwiTGF5b3V0RWRpdG9yXCIpXHJcbiAgICAuZGlyZWN0aXZlKFwib3JjTGF5b3V0Q2FudmFzXCIsIFtcInNjb3BlQ29uZmlndXJhdG9yXCIsIFwiZW52aXJvbm1lbnRcIixcclxuICAgICAgICBmdW5jdGlvbiAoc2NvcGVDb25maWd1cmF0b3IsIGVudmlyb25tZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICByZXN0cmljdDogXCJFXCIsXHJcbiAgICAgICAgICAgICAgICBzY29wZTogeyBlbGVtZW50OiBcIj1cIiB9LFxyXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiJGVsZW1lbnRcIiwgXCIkYXR0cnNcIixcclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlQ29uZmlndXJhdG9yLmNvbmZpZ3VyZUZvckVsZW1lbnQoJHNjb3BlLCAkZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlQ29uZmlndXJhdG9yLmNvbmZpZ3VyZUZvckNvbnRhaW5lcigkc2NvcGUsICRlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNvcnRhYmxlT3B0aW9uc1tcImF4aXNcIl0gPSBcInlcIjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IGVudmlyb25tZW50LnRlbXBsYXRlVXJsKFwiQ2FudmFzXCIpLFxyXG4gICAgICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIF0pOyIsImFuZ3VsYXJcclxuICAgIC5tb2R1bGUoXCJMYXlvdXRFZGl0b3JcIilcclxuICAgIC5kaXJlY3RpdmUoXCJvcmNMYXlvdXRDaGlsZFwiLCBbXCIkY29tcGlsZVwiLFxyXG4gICAgICAgIGZ1bmN0aW9uICgkY29tcGlsZSkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6IFwiRVwiLFxyXG4gICAgICAgICAgICAgICAgc2NvcGU6IHsgZWxlbWVudDogXCI9XCIgfSxcclxuICAgICAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZW1wbGF0ZSA9IFwiPG9yYy1sYXlvdXQtXCIgKyBzY29wZS5lbGVtZW50LnR5cGUudG9Mb3dlckNhc2UoKSArIFwiIGVsZW1lbnQ9J2VsZW1lbnQnIC8+XCI7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGh0bWwgPSAkY29tcGlsZSh0ZW1wbGF0ZSkoc2NvcGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICQoZWxlbWVudCkucmVwbGFjZVdpdGgoaHRtbCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgXSk7IiwiYW5ndWxhclxyXG4gICAgLm1vZHVsZShcIkxheW91dEVkaXRvclwiKVxyXG4gICAgLmRpcmVjdGl2ZShcIm9yY0xheW91dENvbHVtblwiLCBbXCIkY29tcGlsZVwiLCBcInNjb3BlQ29uZmlndXJhdG9yXCIsIFwiZW52aXJvbm1lbnRcIixcclxuICAgICAgICBmdW5jdGlvbiAoJGNvbXBpbGUsIHNjb3BlQ29uZmlndXJhdG9yLCBlbnZpcm9ubWVudCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6IFwiRVwiLFxyXG4gICAgICAgICAgICAgICAgc2NvcGU6IHsgZWxlbWVudDogXCI9XCIgfSxcclxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcIiRzY29wZVwiLCBcIiRlbGVtZW50XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVDb25maWd1cmF0b3IuY29uZmlndXJlRm9yRWxlbWVudCgkc2NvcGUsICRlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVDb25maWd1cmF0b3IuY29uZmlndXJlRm9yQ29udGFpbmVyKCRzY29wZSwgJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc29ydGFibGVPcHRpb25zW1wiYXhpc1wiXSA9IFwieVwiO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogZW52aXJvbm1lbnQudGVtcGxhdGVVcmwoXCJDb2x1bW5cIiksXHJcbiAgICAgICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuZmluZChcIi5sYXlvdXQtY29sdW1uLXJlc2l6ZS1iYXJcIikuZHJhZ2dhYmxlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXhpczogXCJ4XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlbHBlcjogXCJjbG9uZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXZlcnQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBmdW5jdGlvbiAoZSwgdWkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuZWxlbWVudC5lZGl0b3IuaXNSZXNpemluZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZzogZnVuY3Rpb24gKGUsIHVpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29sdW1uRWxlbWVudCA9IGVsZW1lbnQucGFyZW50KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29sdW1uU2l6ZSA9IGNvbHVtbkVsZW1lbnQud2lkdGgoKSAvIHNjb3BlLmVsZW1lbnQud2lkdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29ubmVjdEFkamFjZW50ID0gIWUuY3RybEtleTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkKGUudGFyZ2V0KS5oYXNDbGFzcyhcImxheW91dC1jb2x1bW4tcmVzaXplLWJhci1sZWZ0XCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRlbHRhID0gdWkub2Zmc2V0LmxlZnQgLSBjb2x1bW5FbGVtZW50Lm9mZnNldCgpLmxlZnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRlbHRhIDwgLWNvbHVtblNpemUgJiYgc2NvcGUuZWxlbWVudC5jYW5FeHBhbmRMZWZ0KGNvbm5lY3RBZGphY2VudCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmVsZW1lbnQuZXhwYW5kTGVmdChjb25uZWN0QWRqYWNlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoZGVsdGEgPiBjb2x1bW5TaXplICYmIHNjb3BlLmVsZW1lbnQuY2FuQ29udHJhY3RMZWZ0KGNvbm5lY3RBZGphY2VudCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmVsZW1lbnQuY29udHJhY3RMZWZ0KGNvbm5lY3RBZGphY2VudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKCQoZS50YXJnZXQpLmhhc0NsYXNzKFwibGF5b3V0LWNvbHVtbi1yZXNpemUtYmFyLXJpZ2h0XCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRlbHRhID0gdWkub2Zmc2V0LmxlZnQgLSBjb2x1bW5FbGVtZW50LndpZHRoKCkgLSBjb2x1bW5FbGVtZW50Lm9mZnNldCgpLmxlZnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRlbHRhID4gY29sdW1uU2l6ZSAmJiBzY29wZS5lbGVtZW50LmNhbkV4cGFuZFJpZ2h0KGNvbm5lY3RBZGphY2VudCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmVsZW1lbnQuZXhwYW5kUmlnaHQoY29ubmVjdEFkamFjZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGRlbHRhIDwgLWNvbHVtblNpemUgJiYgc2NvcGUuZWxlbWVudC5jYW5Db250cmFjdFJpZ2h0KGNvbm5lY3RBZGphY2VudCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmVsZW1lbnQuY29udHJhY3RSaWdodChjb25uZWN0QWRqYWNlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdG9wOiBmdW5jdGlvbiAoZSwgdWkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmVsZW1lbnQuZWRpdG9yLmlzUmVzaXppbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgXSk7IiwiYW5ndWxhclxyXG4gICAgLm1vZHVsZShcIkxheW91dEVkaXRvclwiKVxyXG4gICAgLmRpcmVjdGl2ZShcIm9yY0xheW91dENvbnRlbnRcIiwgW1wiJHNjZVwiLCBcInNjb3BlQ29uZmlndXJhdG9yXCIsIFwiZW52aXJvbm1lbnRcIixcclxuICAgICAgICBmdW5jdGlvbiAoJHNjZSwgc2NvcGVDb25maWd1cmF0b3IsIGVudmlyb25tZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICByZXN0cmljdDogXCJFXCIsXHJcbiAgICAgICAgICAgICAgICBzY29wZTogeyBlbGVtZW50OiBcIj1cIiB9LFxyXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiJGVsZW1lbnRcIixcclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZUNvbmZpZ3VyYXRvci5jb25maWd1cmVGb3JFbGVtZW50KCRzY29wZSwgJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kcm9vdC5lZGl0RWxlbWVudCgkc2NvcGUuZWxlbWVudCkudGhlbihmdW5jdGlvbiAoYXJncykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5jYW5jZWwpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5kYXRhID0gYXJncy5lbGVtZW50LmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbGVtZW50LnNldEh0bWwoYXJncy5lbGVtZW50Lmh0bWwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBPdmVyd3JpdGUgdGhlIHNldEh0bWwgZnVuY3Rpb24gc28gdGhhdCB3ZSBjYW4gdXNlIHRoZSAkc2NlIHNlcnZpY2UgdG8gdHJ1c3QgdGhlIGh0bWwgKGFuZCBub3QgaGF2ZSB0aGUgaHRtbCBiaW5kaW5nIHN0cmlwIGNlcnRhaW4gdGFncykuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbGVtZW50LnNldEh0bWwgPSBmdW5jdGlvbiAoaHRtbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVsZW1lbnQuaHRtbCA9IGh0bWw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5odG1sVW5zYWZlID0gJHNjZS50cnVzdEFzSHRtbChodG1sKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbGVtZW50LnNldEh0bWwoJHNjb3BlLmVsZW1lbnQuaHRtbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiBlbnZpcm9ubWVudC50ZW1wbGF0ZVVybChcIkNvbnRlbnRcIiksXHJcbiAgICAgICAgICAgICAgICByZXBsYWNlOiB0cnVlXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgXSk7IiwiYW5ndWxhclxyXG4gICAgLm1vZHVsZShcIkxheW91dEVkaXRvclwiKVxyXG4gICAgLmRpcmVjdGl2ZShcIm9yY0xheW91dEh0bWxcIiwgW1wiJHNjZVwiLCBcInNjb3BlQ29uZmlndXJhdG9yXCIsIFwiZW52aXJvbm1lbnRcIixcclxuICAgICAgICBmdW5jdGlvbiAoJHNjZSwgc2NvcGVDb25maWd1cmF0b3IsIGVudmlyb25tZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICByZXN0cmljdDogXCJFXCIsXHJcbiAgICAgICAgICAgICAgICBzY29wZTogeyBlbGVtZW50OiBcIj1cIiB9LFxyXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiJGVsZW1lbnRcIixcclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZUNvbmZpZ3VyYXRvci5jb25maWd1cmVGb3JFbGVtZW50KCRzY29wZSwgJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kcm9vdC5lZGl0RWxlbWVudCgkc2NvcGUuZWxlbWVudCkudGhlbihmdW5jdGlvbiAoYXJncykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5jYW5jZWwpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5kYXRhID0gYXJncy5lbGVtZW50LmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbGVtZW50LnNldEh0bWwoYXJncy5lbGVtZW50Lmh0bWwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS51cGRhdGVDb250ZW50ID0gZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbGVtZW50LnNldEh0bWwoZS50YXJnZXQuaW5uZXJIVE1MKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE92ZXJ3cml0ZSB0aGUgc2V0SHRtbCBmdW5jdGlvbiBzbyB0aGF0IHdlIGNhbiB1c2UgdGhlICRzY2Ugc2VydmljZSB0byB0cnVzdCB0aGUgaHRtbCAoYW5kIG5vdCBoYXZlIHRoZSBodG1sIGJpbmRpbmcgc3RyaXAgY2VydGFpbiB0YWdzKS5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVsZW1lbnQuc2V0SHRtbCA9IGZ1bmN0aW9uIChodG1sKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5odG1sID0gaHRtbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbGVtZW50Lmh0bWxVbnNhZmUgPSAkc2NlLnRydXN0QXNIdG1sKGh0bWwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVsZW1lbnQuc2V0SHRtbCgkc2NvcGUuZWxlbWVudC5odG1sKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IGVudmlyb25tZW50LnRlbXBsYXRlVXJsKFwiSHRtbFwiKSxcclxuICAgICAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBNb3VzZSBkb3duIGV2ZW50cyBtdXN0IG5vdCBiZSBpbnRlcmNlcHRlZCBieSBkcmFnIGFuZCBkcm9wIHdoaWxlIGlubGluZSBlZGl0aW5nIGlzIGFjdGl2ZSxcclxuICAgICAgICAgICAgICAgICAgICAvLyBvdGhlcndpc2UgY2xpY2tzIGluIGlubGluZSBlZGl0b3JzIHdpbGwgaGF2ZSBubyBlZmZlY3QuXHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5maW5kKFwiLmxheW91dC1jb250ZW50LW1hcmt1cFwiKS5tb3VzZWRvd24oZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjb3BlLmVsZW1lbnQuZWRpdG9yLmlubGluZUVkaXRpbmdJc0FjdGl2ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIF0pOyIsImFuZ3VsYXJcclxuICAgIC5tb2R1bGUoXCJMYXlvdXRFZGl0b3JcIilcclxuICAgIC5kaXJlY3RpdmUoXCJvcmNMYXlvdXRHcmlkXCIsIFtcIiRjb21waWxlXCIsIFwic2NvcGVDb25maWd1cmF0b3JcIiwgXCJlbnZpcm9ubWVudFwiLFxyXG4gICAgICAgIGZ1bmN0aW9uICgkY29tcGlsZSwgc2NvcGVDb25maWd1cmF0b3IsIGVudmlyb25tZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICByZXN0cmljdDogXCJFXCIsXHJcbiAgICAgICAgICAgICAgICBzY29wZTogeyBlbGVtZW50OiBcIj1cIiB9LFxyXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiJGVsZW1lbnRcIixcclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZUNvbmZpZ3VyYXRvci5jb25maWd1cmVGb3JFbGVtZW50KCRzY29wZSwgJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZUNvbmZpZ3VyYXRvci5jb25maWd1cmVGb3JDb250YWluZXIoJHNjb3BlLCAkZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zb3J0YWJsZU9wdGlvbnNbXCJheGlzXCJdID0gXCJ5XCI7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiBlbnZpcm9ubWVudC50ZW1wbGF0ZVVybChcIkdyaWRcIiksXHJcbiAgICAgICAgICAgICAgICByZXBsYWNlOiB0cnVlXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgXSk7IiwiYW5ndWxhclxyXG4gICAgLm1vZHVsZShcIkxheW91dEVkaXRvclwiKVxyXG4gICAgLmRpcmVjdGl2ZShcIm9yY0xheW91dFJvd1wiLCBbXCIkY29tcGlsZVwiLCBcInNjb3BlQ29uZmlndXJhdG9yXCIsIFwiZW52aXJvbm1lbnRcIixcclxuICAgICAgICBmdW5jdGlvbiAoJGNvbXBpbGUsIHNjb3BlQ29uZmlndXJhdG9yLCBlbnZpcm9ubWVudCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6IFwiRVwiLFxyXG4gICAgICAgICAgICAgICAgc2NvcGU6IHsgZWxlbWVudDogXCI9XCIgfSxcclxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcIiRzY29wZVwiLCBcIiRlbGVtZW50XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVDb25maWd1cmF0b3IuY29uZmlndXJlRm9yRWxlbWVudCgkc2NvcGUsICRlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVDb25maWd1cmF0b3IuY29uZmlndXJlRm9yQ29udGFpbmVyKCRzY29wZSwgJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc29ydGFibGVPcHRpb25zW1wiYXhpc1wiXSA9IFwieFwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc29ydGFibGVPcHRpb25zW1widWktZmxvYXRpbmdcIl0gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogZW52aXJvbm1lbnQudGVtcGxhdGVVcmwoXCJSb3dcIiksXHJcbiAgICAgICAgICAgICAgICByZXBsYWNlOiB0cnVlXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgXSk7IiwiYW5ndWxhclxyXG4gICAgLm1vZHVsZShcIkxheW91dEVkaXRvclwiKVxyXG4gICAgLmRpcmVjdGl2ZShcIm9yY0xheW91dFBvcHVwXCIsIFtcclxuICAgICAgICBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICByZXN0cmljdDogXCJBXCIsXHJcbiAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBvcHVwID0gJChlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdHJpZ2dlciA9IHBvcHVwLmNsb3Nlc3QoXCIubGF5b3V0LXBvcHVwLXRyaWdnZXJcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmVudEVsZW1lbnQgPSBwb3B1cC5jbG9zZXN0KFwiLmxheW91dC1lbGVtZW50XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRyaWdnZXIuY2xpY2soZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3B1cC50b2dnbGUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBvcHVwLmlzKFwiOnZpc2libGVcIikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcHVwLnBvc2l0aW9uKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBteTogYXR0cnMub3JjTGF5b3V0UG9wdXBNeSB8fCBcImxlZnQgdG9wXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXQ6IGF0dHJzLm9yY0xheW91dFBvcHVwQXQgfHwgXCJsZWZ0IGJvdHRvbSs0cHhcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZjogdHJpZ2dlclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3B1cC5maW5kKFwiaW5wdXRcIikuZmlyc3QoKS5mb2N1cygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcG9wdXAuY2xpY2soZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBwYXJlbnRFbGVtZW50LmNsaWNrKGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcHVwLmhpZGUoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBwb3B1cC5rZXlkb3duKGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZS5jdHJsS2V5ICYmICFlLnNoaWZ0S2V5ICYmICFlLmFsdEtleSAmJiBlLndoaWNoID09IDI3KSAvLyBFc2NcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcHVwLmhpZGUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBwb3B1cC5vbihcImN1dCBjb3B5IHBhc3RlXCIsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFsbG93IGNsaXBib2FyZCBvcGVyYXRpb25zIGluIHBvcHVwIHdpdGhvdXQgaW52b2tpbmcgY2xpcGJvYXJkIGV2ZW50IGhhbmRsZXJzIG9uIHBhcmVudCBlbGVtZW50LlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIF0pOyIsImFuZ3VsYXJcclxuICAgIC5tb2R1bGUoXCJMYXlvdXRFZGl0b3JcIilcclxuICAgIC5kaXJlY3RpdmUoXCJvcmNMYXlvdXRUb29sYm94XCIsIFtcIiRjb21waWxlXCIsIFwiZW52aXJvbm1lbnRcIixcclxuICAgICAgICBmdW5jdGlvbiAoJGNvbXBpbGUsIGVudmlyb25tZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICByZXN0cmljdDogXCJFXCIsXHJcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXCIkc2NvcGVcIiwgXCIkZWxlbWVudFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50KSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUucmVzZXRFbGVtZW50cyA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZ3JpZEVsZW1lbnRzID0gW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExheW91dEVkaXRvci5HcmlkLmZyb20oe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94SWNvbjogXCJcXHVmMDBhXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hMYWJlbDogXCJHcmlkXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hEZXNjcmlwdGlvbjogXCJFbXB0eSBncmlkLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogW11cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUucm93RWxlbWVudHMgPSBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF5b3V0RWRpdG9yLlJvdy5mcm9tKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveEljb246IFwiXFx1ZjBjOVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94TGFiZWw6IFwiUm93ICgxIGNvbHVtbilcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveERlc2NyaXB0aW9uOiBcIlJvdyB3aXRoIDEgY29sdW1uLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogTGF5b3V0RWRpdG9yLkNvbHVtbi50aW1lcygxKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExheW91dEVkaXRvci5Sb3cuZnJvbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hJY29uOiBcIlxcdWYwYzlcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveExhYmVsOiBcIlJvdyAoMiBjb2x1bW5zKVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94RGVzY3JpcHRpb246IFwiUm93IHdpdGggMiBjb2x1bW5zLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogTGF5b3V0RWRpdG9yLkNvbHVtbi50aW1lcygyKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExheW91dEVkaXRvci5Sb3cuZnJvbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hJY29uOiBcIlxcdWYwYzlcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveExhYmVsOiBcIlJvdyAoMyBjb2x1bW5zKVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94RGVzY3JpcHRpb246IFwiUm93IHdpdGggMyBjb2x1bW5zLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogTGF5b3V0RWRpdG9yLkNvbHVtbi50aW1lcygzKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExheW91dEVkaXRvci5Sb3cuZnJvbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hJY29uOiBcIlxcdWYwYzlcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveExhYmVsOiBcIlJvdyAoNCBjb2x1bW5zKVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94RGVzY3JpcHRpb246IFwiUm93IHdpdGggNCBjb2x1bW5zLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogTGF5b3V0RWRpdG9yLkNvbHVtbi50aW1lcyg0KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExheW91dEVkaXRvci5Sb3cuZnJvbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hJY29uOiBcIlxcdWYwYzlcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveExhYmVsOiBcIlJvdyAoNiBjb2x1bW5zKVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94RGVzY3JpcHRpb246IFwiUm93IHdpdGggNiBjb2x1bW5zLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogTGF5b3V0RWRpdG9yLkNvbHVtbi50aW1lcyg2KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExheW91dEVkaXRvci5Sb3cuZnJvbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hJY29uOiBcIlxcdWYwYzlcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveExhYmVsOiBcIlJvdyAoMTIgY29sdW1ucylcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveERlc2NyaXB0aW9uOiBcIlJvdyB3aXRoIDEyIGNvbHVtbnMuXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBMYXlvdXRFZGl0b3IuQ29sdW1uLnRpbWVzKDEyKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLCBMYXlvdXRFZGl0b3IuUm93LmZyb20oe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94SWNvbjogXCJcXHVmMGM5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hMYWJlbDogXCJSb3cgKGVtcHR5KVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94RGVzY3JpcHRpb246IFwiRW1wdHkgcm93LlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogW11cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29sdW1uRWxlbWVudHMgPSBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF5b3V0RWRpdG9yLkNvbHVtbi5mcm9tKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveEljb246IFwiXFx1ZjBkYlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94TGFiZWw6IFwiQ29sdW1uXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hEZXNjcmlwdGlvbjogXCJFbXB0eSBjb2x1bW4uXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQ6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jb250ZW50RWxlbWVudENhdGVnb3JpZXMgPSBfKCRzY29wZS5lbGVtZW50LmNvbmZpZy5jYXRlZ29yaWVzKS5tYXAoZnVuY3Rpb24gKGNhdGVnb3J5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogY2F0ZWdvcnkubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudHM6IF8oY2F0ZWdvcnkuY29udGVudFR5cGVzKS5tYXAoZnVuY3Rpb24gKGNvbnRlbnRUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IGNvbnRlbnRUeXBlLnR5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZmFjdG9yeSA9IExheW91dEVkaXRvci5mYWN0b3JpZXNbdHlwZV0gfHwgTGF5b3V0RWRpdG9yLmZhY3Rvcmllc1tcIkNvbnRlbnRcIl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaXRlbSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc1RlbXBsYXRlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudFR5cGU6IGNvbnRlbnRUeXBlLmlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnRUeXBlTGFiZWw6IGNvbnRlbnRUeXBlLmxhYmVsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnRUeXBlQ2xhc3M6IGNvbnRlbnRUeXBlLnR5cGVDbGFzcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0VkaXRvcjogY29udGVudFR5cGUuaGFzRWRpdG9yLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnRUeXBlLmh0bWxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZWxlbWVudCA9IGZhY3RvcnkoaXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnRvb2xib3hJY29uID0gY29udGVudFR5cGUuaWNvbiB8fCBcIlxcdWYxYzlcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQudG9vbGJveExhYmVsID0gY29udGVudFR5cGUubGFiZWw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnRvb2xib3hEZXNjcmlwdGlvbiA9IGNvbnRlbnRUeXBlLmRlc2NyaXB0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5yZXNldEVsZW1lbnRzKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZ2V0U29ydGFibGVPcHRpb25zID0gZnVuY3Rpb24gKHR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBlZGl0b3JJZCA9ICRlbGVtZW50LmNsb3Nlc3QoXCIubGF5b3V0LWVkaXRvclwiKS5hdHRyKFwiaWRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFyZW50Q2xhc3NlcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwbGFjZWhvbGRlckNsYXNzZXM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZmxvYXRpbmcgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiR3JpZFwiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRDbGFzc2VzID0gW1wiLmxheW91dC1jYW52YXNcIiwgXCIubGF5b3V0LWNvbHVtblwiLCBcIi5sYXlvdXQtY29tbW9uLWhvbGRlclwiXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXJDbGFzc2VzID0gXCJsYXlvdXQtZWxlbWVudCBsYXlvdXQtY29udGFpbmVyIGxheW91dC1ncmlkIHVpLXNvcnRhYmxlLXBsYWNlaG9sZGVyXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJSb3dcIjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50Q2xhc3NlcyA9IFtcIi5sYXlvdXQtZ3JpZFwiXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXJDbGFzc2VzID0gXCJsYXlvdXQtZWxlbWVudCBsYXlvdXQtY29udGFpbmVyIGxheW91dC1yb3cgcm93IHVpLXNvcnRhYmxlLXBsYWNlaG9sZGVyXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJDb2x1bW5cIjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50Q2xhc3NlcyA9IFtcIi5sYXlvdXQtcm93Om5vdCgubGF5b3V0LXJvdy1mdWxsKVwiXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXJDbGFzc2VzID0gXCJsYXlvdXQtZWxlbWVudCBsYXlvdXQtY29udGFpbmVyIGxheW91dC1jb2x1bW4gdWktc29ydGFibGUtcGxhY2Vob2xkZXJcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxvYXRpbmcgPSB0cnVlOyAvLyBUbyBlbnN1cmUgYSBzbW9vdGggaG9yaXpvbnRhbC1saXN0IHJlb3JkZXJpbmcuIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyLXVpL3VpLXNvcnRhYmxlI2Zsb2F0aW5nXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJDb250ZW50XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudENsYXNzZXMgPSBbXCIubGF5b3V0LWNhbnZhc1wiLCBcIi5sYXlvdXQtY29sdW1uXCIsIFwiLmxheW91dC1jb21tb24taG9sZGVyXCJdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlckNsYXNzZXMgPSBcImxheW91dC1lbGVtZW50IGxheW91dC1jb250ZW50IHVpLXNvcnRhYmxlLXBsYWNlaG9sZGVyXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3Vyc29yOiBcIm1vdmVcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0V2l0aDogXyhwYXJlbnRDbGFzc2VzKS5tYXAoZnVuY3Rpb24gKGUpIHsgcmV0dXJuIFwiI1wiICsgZWRpdG9ySWQgKyBcIiBcIiArIGUgKyBcIjpub3QoLmxheW91dC1jb250YWluZXItc2VhbGVkKSA+IC5sYXlvdXQtZWxlbWVudC13cmFwcGVyID4gLmxheW91dC1jaGlsZHJlblwiOyB9KS5qb2luKFwiLCBcIiksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IHBsYWNlaG9sZGVyQ2xhc3NlcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInVpLWZsb2F0aW5nXCI6IGZsb2F0aW5nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZTogZnVuY3Rpb24gKGUsIHVpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUudGFyZ2V0LmlzVG9vbGJveCA9IHRydWU7IC8vIFdpbGwgaW5kaWNhdGUgdG8gY29ubmVjdGVkIHNvcnRhYmxlcyB0aGF0IGRyb3BwZWQgaXRlbXMgd2VyZSBzZW50IGZyb20gdG9vbGJveC5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBmdW5jdGlvbiAoZSwgdWkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5pc0RyYWdnaW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9wOiBmdW5jdGlvbiAoZSwgdWkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5pc0RyYWdnaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUucmVzZXRFbGVtZW50cygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG92ZXI6IGZ1bmN0aW9uIChlLCB1aSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbGVtZW50LmNhbnZhcy5zZXRJc0Ryb3BUYXJnZXQoZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxheW91dElzQ29sbGFwc2VkQ29va2llTmFtZSA9IFwibGF5b3V0VG9vbGJveENhdGVnb3J5X0xheW91dF9Jc0NvbGxhcHNlZFwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUubGF5b3V0SXNDb2xsYXBzZWQgPSAkLmNvb2tpZShsYXlvdXRJc0NvbGxhcHNlZENvb2tpZU5hbWUpID09PSBcInRydWVcIjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS50b2dnbGVMYXlvdXRJc0NvbGxhcHNlZCA9IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUubGF5b3V0SXNDb2xsYXBzZWQgPSAhJHNjb3BlLmxheW91dElzQ29sbGFwc2VkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJC5jb29raWUobGF5b3V0SXNDb2xsYXBzZWRDb29raWVOYW1lLCAkc2NvcGUubGF5b3V0SXNDb2xsYXBzZWQsIHsgZXhwaXJlczogMzY1IH0pOyAvLyBSZW1lbWJlciBjb2xsYXBzZWQgc3RhdGUgZm9yIGEgeWVhci5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiBlbnZpcm9ubWVudC50ZW1wbGF0ZVVybChcIlRvb2xib3hcIiksXHJcbiAgICAgICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRvb2xib3ggPSBlbGVtZW50LmZpbmQoXCIubGF5b3V0LXRvb2xib3hcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgJCh3aW5kb3cpLm9uKFwicmVzaXplIHNjcm9sbFwiLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2FudmFzID0gZWxlbWVudC5wYXJlbnQoKS5maW5kKFwiLmxheW91dC1jYW52YXNcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIHRoZSBjYW52YXMgaXMgdGFsbGVyIHRoYW4gdGhlIHRvb2xib3gsIG1ha2UgdGhlIHRvb2xib3ggc3RpY2t5LXBvc2l0aW9uZWQgd2l0aGluIHRoZSBlZGl0b3JcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdG8gaGVscCB0aGUgdXNlciBhdm9pZCBleGNlc3NpdmUgdmVydGljYWwgc2Nyb2xsaW5nLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2FudmFzSXNUYWxsZXIgPSAhIWNhbnZhcyAmJiBjYW52YXMuaGVpZ2h0KCkgPiB0b29sYm94LmhlaWdodCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgd2luZG93UG9zID0gJCh3aW5kb3cpLnNjcm9sbFRvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FudmFzSXNUYWxsZXIgJiYgd2luZG93UG9zID4gZWxlbWVudC5vZmZzZXQoKS50b3AgKyBlbGVtZW50LmhlaWdodCgpIC0gdG9vbGJveC5oZWlnaHQoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveC5hZGRDbGFzcyhcInN0aWNreS1ib3R0b21cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94LnJlbW92ZUNsYXNzKFwic3RpY2t5LXRvcFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChjYW52YXNJc1RhbGxlciAmJiB3aW5kb3dQb3MgPiBlbGVtZW50Lm9mZnNldCgpLnRvcCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveC5hZGRDbGFzcyhcInN0aWNreS10b3BcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94LnJlbW92ZUNsYXNzKFwic3RpY2t5LWJvdHRvbVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3gucmVtb3ZlQ2xhc3MoXCJzdGlja3ktdG9wXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveC5yZW1vdmVDbGFzcyhcInN0aWNreS1ib3R0b21cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICBdKTsiLCJhbmd1bGFyXHJcbiAgICAubW9kdWxlKFwiTGF5b3V0RWRpdG9yXCIpXHJcbiAgICAuZGlyZWN0aXZlKFwib3JjTGF5b3V0VG9vbGJveEdyb3VwXCIsIFtcIiRjb21waWxlXCIsIFwiZW52aXJvbm1lbnRcIixcclxuICAgICAgICBmdW5jdGlvbiAoJGNvbXBpbGUsIGVudmlyb25tZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICByZXN0cmljdDogXCJFXCIsXHJcbiAgICAgICAgICAgICAgICBzY29wZTogeyBjYXRlZ29yeTogXCI9XCIgfSxcclxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcIiRzY29wZVwiLCBcIiRlbGVtZW50XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlzQ29sbGFwc2VkQ29va2llTmFtZSA9IFwibGF5b3V0VG9vbGJveENhdGVnb3J5X1wiICsgJHNjb3BlLmNhdGVnb3J5Lm5hbWUgKyBcIl9Jc0NvbGxhcHNlZFwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaXNDb2xsYXBzZWQgPSAkLmNvb2tpZShpc0NvbGxhcHNlZENvb2tpZU5hbWUpID09PSBcInRydWVcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnRvZ2dsZUlzQ29sbGFwc2VkID0gZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5pc0NvbGxhcHNlZCA9ICEkc2NvcGUuaXNDb2xsYXBzZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkLmNvb2tpZShpc0NvbGxhcHNlZENvb2tpZU5hbWUsICRzY29wZS5pc0NvbGxhcHNlZCwgeyBleHBpcmVzOiAzNjUgfSk7IC8vIFJlbWVtYmVyIGNvbGxhcHNlZCBzdGF0ZSBmb3IgYSB5ZWFyLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IGVudmlyb25tZW50LnRlbXBsYXRlVXJsKFwiVG9vbGJveEdyb3VwXCIpLFxyXG4gICAgICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIF0pOyJdfQ==
