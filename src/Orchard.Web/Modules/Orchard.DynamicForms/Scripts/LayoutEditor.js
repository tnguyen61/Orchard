var LayoutEditor;
(function ($, LayoutEditor) {

    LayoutEditor.Fieldset = function (data, htmlId, htmlClass, htmlStyle, isTemplated, legend, contentType, contentTypeLabel, contentTypeClass, hasEditor, children) {
        LayoutEditor.Element.call(this, "Fieldset", data, htmlId, htmlClass, htmlStyle, isTemplated);
        LayoutEditor.Container.call(this, ["Grid", "Content"], children);

        var self = this;
        this.isContainable = true;
        this.dropTargetClass = "layout-common-holder";
        this.contentType = contentType;
        this.contentTypeLabel = contentTypeLabel;
        this.contentTypeClass = contentTypeClass;
        this.legend = legend || "";
        this.hasEditor = hasEditor;

        this.toObject = function () {
            var result = this.elementToObject();
            result.legend = this.legend;
            result.children = this.childrenToObject();

            return result;
        };

        var getEditorObject = this.getEditorObject;
        this.getEditorObject = function() {
            var dto = getEditorObject();
            return $.extend(dto, {
                Legend: this.legend
            });
        }

        this.setChildren = function (children) {
            this.children = children;
            _(this.children).each(function (child) {
                child.parent = self;
            });
        };

        this.setChildren(children);
    };

    LayoutEditor.Fieldset.from = function (value) {
        return new LayoutEditor.Fieldset(
            value.data,
            value.htmlId,
            value.htmlClass,
            value.htmlStyle,
            value.isTemplated,
            value.legend,
            value.contentType,
            value.contentTypeLabel,
            value.contentTypeClass,
            value.hasEditor,
            LayoutEditor.childrenFrom(value.children));
    };

    LayoutEditor.registerFactory("Fieldset", function(value) {
        return LayoutEditor.Fieldset.from(value);
    });

})(jQuery, LayoutEditor || (LayoutEditor = {}));
var LayoutEditor;
(function ($, LayoutEditor) {

    LayoutEditor.Form = function (data, htmlId, htmlClass, htmlStyle, isTemplated, name, formBindingContentType, contentType, contentTypeLabel, contentTypeClass, hasEditor, children) {
        LayoutEditor.Element.call(this, "Form", data, htmlId, htmlClass, htmlStyle, isTemplated);
        LayoutEditor.Container.call(this, ["Grid", "Content"], children);

        var self = this;
        this.isContainable = true;
        this.dropTargetClass = "layout-common-holder";
        this.contentType = contentType;
        this.contentTypeLabel = contentTypeLabel;
        this.contentTypeClass = contentTypeClass;
        this.name = name || "Untitled";
        this.formBindingContentType = formBindingContentType;
        this.hasEditor = hasEditor;

        this.toObject = function () {
            var result = this.elementToObject();
            result.name = this.name;
            result.formBindingContentType = this.formBindingContentType;
            result.children = this.childrenToObject();

            return result;
        };

        var getEditorObject = this.getEditorObject;
        this.getEditorObject = function() {
            var dto = getEditorObject();
            return $.extend(dto, {
                FormName: this.name,
                FormBindingContentType: this.formBindingContentType
            });
        }

        this.setChildren = function (children) {
            this.children = children;
            _(this.children).each(function (child) {
                child.parent = self;
                self.linkChild(child);
            });
        };

        this.linkChild = function(element) {
            var getEditorObject = element.getEditorObject;
            element.getEditorObject = function () {
                var dto = getEditorObject();
                return $.extend(dto, {
                    FormBindingContentType: self.formBindingContentType
                });
            };
        };

        this.setChildren(children);
    };

    LayoutEditor.Form.from = function (value) {
        return new LayoutEditor.Form(
            value.data,
            value.htmlId,
            value.htmlClass,
            value.htmlStyle,
            value.isTemplated,
            value.name,
            value.formBindingContentType,
            value.contentType,
            value.contentTypeLabel,
            value.contentTypeClass,
            value.hasEditor,
            LayoutEditor.childrenFrom(value.children));
    };

    LayoutEditor.registerFactory("Form", function(value) { return LayoutEditor.Form.from(value); });

})(jQuery, LayoutEditor || (LayoutEditor = {}));
angular
    .module("LayoutEditor")
    .directive("orcLayoutFieldset", ["$compile", "scopeConfigurator", "environment",
        function ($compile, scopeConfigurator, environment) {
            return {
                restrict: "E",
                scope: { element: "=" },
                controller: ["$scope", "$element",
                    function ($scope, $element) {
                        scopeConfigurator.configureForElement($scope, $element);
                        scopeConfigurator.configureForContainer($scope, $element);
                        $scope.sortableOptions["axis"] = "y";
                        $scope.edit = function () {
                            $scope.$root.editElement($scope.element).then(function (args) {
                                if (args.cancel)
                                    return;
                                $scope.element.data = decodeURIComponent(args.element.data);
                                $scope.element.legend = args.elementEditorModel.legend;
                                $scope.$apply();
                            });
                        };
                    }
                ],
                templateUrl: environment.templateUrl("Fieldset"),
                replace: true
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutForm", ["$compile", "scopeConfigurator", "environment",
        function ($compile, scopeConfigurator, environment) {
            return {
                restrict: "E",
                scope: { element: "=" },
                controller: ["$scope", "$element",
                    function ($scope, $element) {
                        scopeConfigurator.configureForElement($scope, $element);
                        scopeConfigurator.configureForContainer($scope, $element);
                        $scope.sortableOptions["axis"] = "y";
                        $scope.edit = function () {
                            $scope.$root.editElement($scope.element).then(function (args) {
                                if (args.cancel)
                                    return;
                                $scope.element.data = decodeURIComponent(args.element.data);
                                $scope.element.name = args.elementEditorModel.name;
                                $scope.element.formBindingContentType = args.elementEditorModel.formBindingContentType;
                                $scope.$apply();
                            });
                        };
                    }
                ],
                templateUrl: environment.templateUrl("Form"),
                replace: true
            };
        }
    ]);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkZpZWxkc2V0LmpzIiwiRm9ybS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBRDFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6IkxheW91dEVkaXRvci5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXJcclxuICAgIC5tb2R1bGUoXCJMYXlvdXRFZGl0b3JcIilcclxuICAgIC5kaXJlY3RpdmUoXCJvcmNMYXlvdXRGaWVsZHNldFwiLCBbXCIkY29tcGlsZVwiLCBcInNjb3BlQ29uZmlndXJhdG9yXCIsIFwiZW52aXJvbm1lbnRcIixcclxuICAgICAgICBmdW5jdGlvbiAoJGNvbXBpbGUsIHNjb3BlQ29uZmlndXJhdG9yLCBlbnZpcm9ubWVudCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6IFwiRVwiLFxyXG4gICAgICAgICAgICAgICAgc2NvcGU6IHsgZWxlbWVudDogXCI9XCIgfSxcclxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcIiRzY29wZVwiLCBcIiRlbGVtZW50XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVDb25maWd1cmF0b3IuY29uZmlndXJlRm9yRWxlbWVudCgkc2NvcGUsICRlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVDb25maWd1cmF0b3IuY29uZmlndXJlRm9yQ29udGFpbmVyKCRzY29wZSwgJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc29ydGFibGVPcHRpb25zW1wiYXhpc1wiXSA9IFwieVwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kcm9vdC5lZGl0RWxlbWVudCgkc2NvcGUuZWxlbWVudCkudGhlbihmdW5jdGlvbiAoYXJncykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLmNhbmNlbClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbGVtZW50LmRhdGEgPSBkZWNvZGVVUklDb21wb25lbnQoYXJncy5lbGVtZW50LmRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbGVtZW50LmxlZ2VuZCA9IGFyZ3MuZWxlbWVudEVkaXRvck1vZGVsLmxlZ2VuZDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IGVudmlyb25tZW50LnRlbXBsYXRlVXJsKFwiRmllbGRzZXRcIiksXHJcbiAgICAgICAgICAgICAgICByZXBsYWNlOiB0cnVlXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgXSk7IiwiYW5ndWxhclxyXG4gICAgLm1vZHVsZShcIkxheW91dEVkaXRvclwiKVxyXG4gICAgLmRpcmVjdGl2ZShcIm9yY0xheW91dEZvcm1cIiwgW1wiJGNvbXBpbGVcIiwgXCJzY29wZUNvbmZpZ3VyYXRvclwiLCBcImVudmlyb25tZW50XCIsXHJcbiAgICAgICAgZnVuY3Rpb24gKCRjb21waWxlLCBzY29wZUNvbmZpZ3VyYXRvciwgZW52aXJvbm1lbnQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHJlc3RyaWN0OiBcIkVcIixcclxuICAgICAgICAgICAgICAgIHNjb3BlOiB7IGVsZW1lbnQ6IFwiPVwiIH0sXHJcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXCIkc2NvcGVcIiwgXCIkZWxlbWVudFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlQ29uZmlndXJhdG9yLmNvbmZpZ3VyZUZvckVsZW1lbnQoJHNjb3BlLCAkZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlQ29uZmlndXJhdG9yLmNvbmZpZ3VyZUZvckNvbnRhaW5lcigkc2NvcGUsICRlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNvcnRhYmxlT3B0aW9uc1tcImF4aXNcIl0gPSBcInlcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVkaXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJHJvb3QuZWRpdEVsZW1lbnQoJHNjb3BlLmVsZW1lbnQpLnRoZW4oZnVuY3Rpb24gKGFyZ3MpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5jYW5jZWwpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5kYXRhID0gZGVjb2RlVVJJQ29tcG9uZW50KGFyZ3MuZWxlbWVudC5kYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5uYW1lID0gYXJncy5lbGVtZW50RWRpdG9yTW9kZWwubmFtZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5mb3JtQmluZGluZ0NvbnRlbnRUeXBlID0gYXJncy5lbGVtZW50RWRpdG9yTW9kZWwuZm9ybUJpbmRpbmdDb250ZW50VHlwZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IGVudmlyb25tZW50LnRlbXBsYXRlVXJsKFwiRm9ybVwiKSxcclxuICAgICAgICAgICAgICAgIHJlcGxhY2U6IHRydWVcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICBdKTsiXX0=
