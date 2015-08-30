/*
 * Builder client-side Index page controller
 */
+function ($) { "use strict";

    if ($.oc.builder === undefined)
        $.oc.builder = {}

    var Base = $.oc.foundation.base,
        BaseProto = Base.prototype

    var Builder = function() {
        Base.call(this)

        this.$masterTabs = null
        this.masterTabsObj = null
        this.hideStripeIndicatorProxy = null
        this.entityControllers = {}

        this.init()
    }

    Builder.prototype = Object.create(BaseProto)
    Builder.prototype.constructor = Builder

    Builder.prototype.dispose = function() {
        // We don't really care about disposing the 
        // index controller, as it's used only once
        // and always exists during the page life.
        BaseProto.dispose.call(this)
    }

    // PUBLIC METHODS
    // ============================

    Builder.prototype.openOrLoadMasterTab = function($form, serverHandlerName, tabId, data) {
        if (this.masterTabsObj.goTo(tabId))
            return false

        var requestData = data === undefined ? {} : data

        $.oc.stripeLoadIndicator.show()
        $form.request(
            serverHandlerName, 
            { data: requestData }
        ).done(
            this.proxy(this.addMasterTab)
        ).always(
            this.hideStripeIndicatorProxy
        )
    }

    Builder.prototype.getMasterTabActivePane = function() {
        return this.$masterTabs.find('> .tab-content > .tab-pane.active')
    }

    Builder.prototype.unchageTab = function($pane) {
        $pane.find('form').trigger('unchange.oc.changeMonitor')
    }

    Builder.prototype.triggerCommand = function(command, ev) {
        var commandParts = command.split(':')

        if (commandParts.length === 2) {
            var entity = commandParts[0],
                commandToExecute = commandParts[1]

            if (this.entityControllers[entity] === undefined) {
                throw new Error('Unknown entity type: ' + entity)
            }

            this.entityControllers[entity].invokeCommand(commandToExecute, ev)
        }
    }

    // INTERNAL METHODS
    // ============================

    Builder.prototype.init = function() {
        this.$masterTabs = $('#builder-master-tabs')
        this.$sidePanel = $('#builder-side-panel')

        this.masterTabsObj = this.$masterTabs.data('oc.tab')
        this.hideStripeIndicatorProxy = this.proxy(this.hideStripeIndicator)
        new $.oc.tabFormExpandControls(this.$masterTabs)

        this.createEntityControllers()
        this.registerHandlers()
    }

    Builder.prototype.createEntityControllers = function() {
        for (var controller in $.oc.builder.entityControllers) {
            if (controller == "base") {
                continue
            }

            this.entityControllers[controller] = new $.oc.builder.entityControllers[controller](this)
        }
    }

    Builder.prototype.registerHandlers = function() {
        $(document).on('click', '[data-builder-command]', this.proxy(this.onCommand))
        $(document).on('submit', '[data-builder-command]', this.proxy(this.onCommand))

        this.$masterTabs.on('changed.oc.changeMonitor', this.proxy(this.onFormChanged))
        this.$masterTabs.on('unchanged.oc.changeMonitor', this.proxy(this.onFormUnchanged))
        this.$masterTabs.on('shown.bs.tab', this.proxy(this.onTabShown))
        this.$masterTabs.on('afterAllClosed.oc.tab', this.proxy(this.onAllTabsClosed))

        for (var controller in this.entityControllers) {
            if (this.entityControllers[controller].registerHandlers !== undefined) {
                this.entityControllers[controller].registerHandlers()
            }
        }
    }

    Builder.prototype.hideStripeIndicator = function() {
        $.oc.stripeLoadIndicator.hide()
    }

    Builder.prototype.addMasterTab = function(data) {
        this.masterTabsObj.addTab(data.tabTitle, data.tab, data.tabId, data.tabIcon)
    }

    Builder.prototype.updateModifiedCounter = function() {
        var counters = {
            database: { menu: 'database', count: 0 }
        }

        $('> div.tab-content > div.tab-pane[data-modified] > form', this.$masterTabs).each(function(){
            var entity = $(this).data('entity')
            counters[entity].count++
        })

        $.each(counters, function(type, data){
            $.oc.sideNav.setCounter('builder/' + data.menu, data.count);
        })
    }

    Builder.prototype.setPageTitle = function(title) {
        $.oc.layout.setPageTitle(title.length ? (title + ' | ') : title)
    }

    Builder.prototype.getFileLists = function() {
        return $('[data-control=filelist]', this.$sidePanel)
    }

    // EVENT HANDLERS
    // ============================

    Builder.prototype.onCommand = function(ev) {
        if (ev.currentTarget.tagName == 'FORM' && ev.type == 'click') {
            // The form elements could have data-builder-command attribute,
            // but for them we only handle the submit event and ignore clicks. 

            return
        }

        var command = $(ev.currentTarget).data('builderCommand')
        this.triggerCommand(command, ev)
        ev.preventDefault()
        return false
    }

    Builder.prototype.onFormChanged = function(ev) {
        $('.form-tabless-fields', ev.target).trigger('modified.oc.tab')
        this.updateModifiedCounter()
    }

    Builder.prototype.onFormUnchanged = function(ev) {
        $('.form-tabless-fields', ev.target).trigger('unmodified.oc.tab')
        this.updateModifiedCounter()
    }

    Builder.prototype.onTabShown = function(ev) {
        var $tabControl = $(ev.target).closest('[data-control=tab]')

        if ($tabControl.attr('id') != this.$masterTabs.attr('id')) {
            return
        }

        var dataId = $(ev.target).closest('li').attr('data-tab-id'),
            title = $(ev.target).attr('title')

        if (title) {
            this.setPageTitle(title)
        }

        this.getFileLists().fileList('markActive', dataId)

        $(window).trigger('resize')
    }

    Builder.prototype.onAllTabsClosed = function(ev) {
        this.setPageTitle('')
        this.getFileLists().fileList('markActive', null)
    }

    // INITIALIZATION
    // ============================

    $(document).ready(function(){
        $.oc.builder.indexController = new Builder()
    })

}(window.jQuery);