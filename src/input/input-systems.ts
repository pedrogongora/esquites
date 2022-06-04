import * as PIXI from 'pixi.js';
import { Entity, System, Engine } from 'fosfeno';
import { PositionComponent, InputComponent } from '../components';
import { EntityFactory } from '../state';



abstract class BaseInputSystem extends System {

    readonly touchPointer: Entity;
    private touchHandlers: { start: (ev: TouchEvent)=>void, move: (ev: TouchEvent)=>void, end: (ev: TouchEvent)=>void };

    constructor(engine: Engine, touch: Entity) {
        super(engine);
        this.touchPointer = touch;
    }

    protected registerKeys() {
    }

    protected registerTouch() {
        this.touchHandlers = {
            start: touchStart.bind(this),
            move: touchMove.bind(this),
            end: touchEnd.bind(this)
        };
    }

    update(delta: number) {
    }

    stage(): void {
        this.setupKeys();
        this.setupTouch();
        this.setupMouse();
    }
    
    unstage(): void {
        this.cleanKeys();
        this.cleanTouch();
        this.cleanMouse();
    }

    cleanup() {}

    destroy() {
    }

    private setupKeys() {
        this.engine.input.keyboard.listenBasicStatus();
        this.registerKeys();
    }

    private setupTouch() {
        this.engine.input.mobile.listenBasicStatus();
        this.registerTouch();
        if ( this.touchHandlers ) {
            this.engine.input.mobile.registerMobileEvent({
                eventType: "touchstart",
                callback: this.touchHandlers.start,
                target: this.engine.pixiApp.view
            });

            this.engine.input.mobile.registerMobileEvent({
                eventType: "touchmove",
                callback: this.touchHandlers.move,
                target: this.engine.pixiApp.view
            });
            this.engine.input.mobile.registerMobileEvent({
                eventType: "touchend",
                callback: this.touchHandlers.end,
                target: this.engine.pixiApp.view
            });
        }
    }

    private setupMouse() {
        this.engine.input.mouse.listenBasicStatus();
        this.engine.input.mouse.registerMouseEvent({
            eventType: 'mousedown',
            callback: mousedown.bind(this),
            fireGameEvent: true
        });
        this.engine.input.mouse.registerMouseEvent({
            eventType: 'mouseup',
            callback: mouseup.bind(this),
            fireGameEvent: true
        });
        this.engine.input.mouse.registerMouseEvent({
            eventType: 'mousemove',
            callback: mousemove.bind(this),
            fireGameEvent: true,
            //throttle: 100
        });
        this.engine.input.mouse.registerMouseEvent({
            eventType: 'click',
            fireGameEvent: true
        });
        this.engine.input.mouse.registerMouseEvent({
            eventType: 'contextmenu',
            passive: false,
            preventDefault: true,
            stopPropagation: true
        });
    }

    private cleanKeys() {
        this.engine.input.keyboard.stopListeningingBasicStatus();
        this.engine.input.keyboard.unregisterAll();
    }

    private cleanTouch() {
        this.engine.input.mobile.stopListeningBasicStatus();
        this.engine.input.mobile.unregisterAll();
    }

    private cleanMouse() {
        this.engine.input.mouse.stopListeningingBasicStatus();
        this.engine.input.mouse.unregisterAll();
    }
}



export class InputSystem extends BaseInputSystem {

    registerKeys() {
        this.engine.input.keyboard.registerKeyEventHandler({
            key: ' ',
            preventDefault: false,
            fireGameEvents: true,
            keydownGameEventType: 'SpaceKeyPress',
            keyupGameEventType: 'SpaceKeyRelease'
        });
        this.engine.input.keyboard.registerKeyEventHandler({
            key: 'f',
            fireGameEvents: true,
            keyupGameEventType: 'Fullscreen'
        });
        this.engine.input.keyboard.registerKeyEventHandler({
            key: 'p',
            fireGameEvents: true,
            keyupGameEventType: 'Pause'
        });
        this.engine.input.keyboard.registerKeyEventHandler({
            key: 'r',
            fireGameEvents: true,
            keyupGameEventType: 'Reset'
        });
    }

    update(delta: number) {
        const keys = this.engine.input.keyboard.keyboardStatus.keys;
        const orientation = this.engine.input.mobile.mobileStatus.orientation;
        const inputComponents = this.getComponentsOfClass( InputComponent );
        inputComponents.forEach((input: InputComponent) => {
            input.up = keys[ 'ArrowUp' ] === true;
            input.down = keys[ 'ArrowDown' ] === true;
            input.left = keys[ 'ArrowLeft' ] === true;
            input.right = keys[ 'ArrowRight' ] === true;
            input.space = keys[ 'Space' ] === true;
            keys[ 'Space' ] = false;
            if ( orientation ) {
                input.alpha = orientation.alpha;
                input.beta = orientation.beta;
                input.gamma = orientation.gamma;
            }
        });
    }
}



export class PauseInputSystem extends BaseInputSystem {

    registerKeys() {
        this.engine.input.keyboard.registerKeyEventHandler({
            key: 'f',
            fireGameEvents: true,
            keyupGameEventType: 'Fullscreen'
        });
        this.engine.input.keyboard.registerKeyEventHandler({
            key: 'p',
            fireGameEvents: true,
            keyupGameEventType: 'Pause'
        });
        this.engine.input.keyboard.registerKeyEventHandler({
            key: 'r',
            fireGameEvents: true,
            keyupGameEventType: 'Reset'
        });
    }
}



export class PlayerDiedInputSystem extends BaseInputSystem {

    registerKeys() {
        this.engine.input.keyboard.registerKeyEventHandler({
            key: 'f',
            fireGameEvents: true,
            keyupGameEventType: 'Fullscreen'
        });
        this.engine.input.keyboard.registerKeyEventHandler({
            key: 'r',
            fireGameEvents: true,
            keyupGameEventType: 'Reset'
        });
    }
}



function touchStart(ev: TouchEvent) {
    const inputComponents = this.getEntitiesBySignature([InputComponent], [PositionComponent]);
    inputComponents.forEach((entity: Entity, input: InputComponent, position: PositionComponent) => {
        input.touch = true;
        if ( position && position.type === 'screen' && ev.changedTouches.length === 1 ) {
            position.x = ev.changedTouches[0].clientX / this.engine.pixiApp.renderer.resolution;
            position.y = ev.changedTouches[0].clientY / this.engine.pixiApp.renderer.resolution;
        }
    });
    const pointer = <PositionComponent> this.engine.entityManager.getEntityComponentOfClass( PositionComponent, EntityFactory.getInstance(this.engine).touchPointer );
    pointer.x = ev.changedTouches[0].clientX / this.engine.pixiApp.renderer.resolution;
    pointer.y = ev.changedTouches[0].clientY / this.engine.pixiApp.renderer.resolution;
    this.publishEvent({
        type: 'TouchStart',
        msg: { x: ev.changedTouches[0].clientX / this.engine.pixiApp.renderer.resolution, y: ev.changedTouches[0].clientY / this.engine.pixiApp.renderer.resolution }
    });
}



function touchMove(ev: TouchEvent) {
    const inputComponents = this.getEntitiesBySignature([InputComponent], [PositionComponent]);
    inputComponents.forEach((entity: Entity, input: InputComponent, position: PositionComponent) => {
        input.touch = true;
        if ( position && position.type === 'screen' && ev.changedTouches.length === 1 ) {
            position.x = ev.changedTouches[0].clientX / this.engine.pixiApp.renderer.resolution;
            position.y = ev.changedTouches[0].clientY / this.engine.pixiApp.renderer.resolution;
        }
    });
    const pointer = <PositionComponent> this.engine.entityManager.getEntityComponentOfClass( PositionComponent, EntityFactory.getInstance(this.engine).touchPointer );
    pointer.x = ev.changedTouches[0].clientX / this.engine.pixiApp.renderer.resolution;
    pointer.y = ev.changedTouches[0].clientY / this.engine.pixiApp.renderer.resolution;
    this.publishEvent({
        type: 'TouchMove',
        msg: { x: ev.changedTouches[0].clientX / this.engine.pixiApp.renderer.resolution, y: ev.changedTouches[0].clientY / this.engine.pixiApp.renderer.resolution }
    });
}



function touchEnd(ev: TouchEvent) {
    const inputComponents = this.getEntitiesBySignature([InputComponent], [PositionComponent]);
    inputComponents.forEach((entity: Entity, input: InputComponent, position: PositionComponent) => {
        input.touch = false;
        if ( position && position.type === 'screen' && ev.changedTouches.length === 1 ) {
            position.x = ev.changedTouches[0].clientX / this.engine.pixiApp.renderer.resolution;
            position.y = ev.changedTouches[0].clientY / this.engine.pixiApp.renderer.resolution;
        }
    });
    const pointer = <PositionComponent> this.engine.entityManager.getEntityComponentOfClass( PositionComponent, EntityFactory.getInstance(this.engine).touchPointer );
    pointer.x = ev.changedTouches[0].clientX / this.engine.pixiApp.renderer.resolution;
    pointer.y = ev.changedTouches[0].clientY / this.engine.pixiApp.renderer.resolution;
    this.publishEvent({
        type: 'TouchEnd',
        msg: { x: ev.changedTouches[0].clientX / this.engine.pixiApp.renderer.resolution, y: ev.changedTouches[0].clientY / this.engine.pixiApp.renderer.resolution }
    });
}

function mousemove(ev: MouseEvent) {
    let inputComponents = () => { return this.engine.entityManager.getComponentsOfClass(InputComponent) };
    inputComponents().forEach((component: InputComponent) => {
        component.mouseX = ev.clientX / this.engine.pixiApp.renderer.resolution;
        component.mouseY = ev.clientY / this.engine.pixiApp.renderer.resolution;
    });
}

function mousedown(ev: MouseEvent) {
    let inputComponents = () => { return this.engine.entityManager.getComponentsOfClass(InputComponent) };
    inputComponents().forEach((component: InputComponent) => {
        if ( ev.button === 0 ) {
            component.mouseLeft = true;
        } else if ( ev.button === 1 ) {
            component.mouseMiddle = true;
        } else if ( ev.button === 2 ) {
            component.mouseRight = true;
        }
        component.mouseX = ev.clientX / this.engine.pixiApp.renderer.resolution;
        component.mouseY = ev.clientY / this.engine.pixiApp.renderer.resolution;
    });
}

function mouseup(ev: MouseEvent) {
    //console.log('mouseup fired')
    let inputComponents = () => { return this.engine.entityManager.getComponentsOfClass(InputComponent) };
    inputComponents().forEach((component: InputComponent) => {
        if ( ev.button === 0 ) component.mouseLeft = false;
        component.mouseX = ev.clientX / this.engine.pixiApp.renderer.resolution;
        component.mouseY = ev.clientY / this.engine.pixiApp.renderer.resolution;
    });
}