import * as PIXI from 'pixi.js';
import { Component, Entity, GameEvent } from 'fosfeno';
import { Box } from '../physics';


type EntityType 
    = 'bear'
    | 'border'
    | 'bunny'
    | 'button'
    | 'collision_event'
    | 'flag'
    | 'floor'
    | 'goal'
    | 'hit_flash'
    | 'pause_button'
    | 'player'
    | 'snowball'
    | 'start_counter'
    | 'touch_pointer'
    | 'tree'
    | 'text'
    | 'tree'
    | 'ui_element'


export class TypeComponent implements Component {

    constructor(
        public type: EntityType
    ) {}

}


export class SpriteComponent implements Component {
    
    readonly sprites: PIXI.Sprite[];
    public alpha: number;
    public current: number;
    public height: number;
    public rotation: number;
    public scale: number;
    public tint: number;
    public visible: boolean;
    public width: number;

    constructor(sprites: PIXI.Sprite[], current: number, visible: boolean) {
        this.sprites = sprites;
        this.current = current;
        this.visible = visible;
        sprites.forEach((s: PIXI.Sprite) => s.visible = false);
        sprites[current].visible = visible;
    }

    toString(): string {
        return `Sprite{a:${this.alpha}, c:${this.current}, h:${this.height}, r:${this.rotation}, s:${this.scale}, t:${this.tint}, v:${this.visible}, w:${this.width},s.l:${this.sprites.length}}`;
    }

}


export class AnimationsComponent implements Component {

    constructor(
        public animations: SpriteAnimation[]
    ) {}

}


export class SpriteAnimation {

    public steps: {
        property: 'alpha' | 'rotation' | 'width' | 'height' | 'scale' | 'tint' | 'current',
        from: number,
        to: number,
        duration: number,
        easing: 'linear' | 'in-out-cubic' | 'in-cubic' | 'out-cubic' | 'in-elastic' | 'out-elastic' | 'out-in-quartic'
    }[];

    public startTime: number;
    public totalDuration: number;
    public iterations: number;
    public iterationsLeft: number;
    public currentStep: number;
    public loop: boolean;
    public visibleWhenOff: boolean;
    public onFinishMessage: GameEvent;
    public off: boolean;

    toString(): string {
        return `Anim{o:${this.off},st:${this.startTime},td:${this.totalDuration},it:${this.iterations},itl:${this.iterationsLeft},l:${this.loop},vo:${this.visibleWhenOff},cs:${this.currentStep}}`
    }

}


export class TextFromProperty implements Component {

    public intervalTimestamp: number;

    constructor(
        public object: any,
        public property: string,
        public text: PIXI.Text,
        public prefix: string,
        public suffix: string,
        public updateInterval: number,
        public format?: (p: any) => string,
    ) {}

}


export class ButtonComponent implements Component {

    public touchStarted: boolean;
    public width: number;
    public height: number;
    public event: GameEvent;

    constructor(width: number, height: number, event: GameEvent) {
        this.width = width;
        this.height = height;
        this.event = event;
    }

}


export class CounterComponent implements Component {
    
    constructor(
        public counter: number
    ) {}

}


export type CoordinateType = 'world' | 'screen' | 'ratio' | 'grid';


export class PositionComponent implements Component {

    constructor(
        public x: number,
        public y: number,
        public type: CoordinateType
    ) {}

}


/* export class PositionComponent implements Component {

    constructor(
        public worldX: number,
        public worldY: number,
        public canvasX: number,
        public canvasY: number,
        public fixed?: boolean
    ) {}

} */


export class VelocityComponent implements Component {

    constructor(
        public vx: number,
        public vy: number
    ) {}

}


export class DynamicsComponent implements Component {

    constructor(
        public mass: number,
        public angle: number,
        public force: { x: number, y: number },
        public velocity: { x: number, y: number },
        public acceleration: { x: number, y: number }
    ) {}

}


export class RenderDynamicsRotation implements Component {}


export class FollowComponent implements Component {

    public entity: Entity;
    public timestamp: number;

    constructor(entity: Entity) {
        this.entity = entity;
    }

}


export class CopyPositionComponent implements Component {

    constructor(
        public entity: Entity
    ) {}

}


export class CollisionComponent implements Component {
    constructor(
        public box: Box
    ) {}
}


export class CollisionEventComponent implements Component {

    constructor(
        public event: GameEvent
    ) {}
}


export class HealthComponent implements Component {

    constructor(
        public hp: number
    ) {}

}


export class DestroyDeadEntityComponent implements Component {

    constructor(
        public destroyWhenDead: boolean
    ) {}

}


export class DestroyWhenAnimationOffComponent implements Component {}


export class DestroyWhenNotOnScreenComponent implements Component {}


export class InputComponent implements Component {


    public up: boolean;
    public down: boolean;
    public left: boolean;
    public right: boolean;
    public space: boolean;

    public touch: boolean;
    public alpha: number;
    public beta: number;
    public gamma: number;

    public mouseLeft: boolean;
    public mouseRight: boolean;
    public mouseMiddle: boolean;
    public mouseX: number;
    public mouseY: number;

}
