import * as PIXI from 'pixi.js';
import { Entity,System,Engine,GameEvent } from 'fosfeno';
import { PositionComponent, InputComponent, DynamicsComponent, CopyPositionComponent, CollisionComponent, FollowComponent } from '../components';
import { EntityFactory, World } from '../state';
import { Box, Quadtree } from './quadtree';


const dt = 1 / 60;
const metersToPixels = (m: number) => { return m * 64 };
const pixelsToMeters = (p: number) => { return p / 64 };
const min = (a: number, b: number) => { return a < b ? a : b };
const max = (a: number, b: number) => { return a > b ? a : b };


const constants = {
    g: 9.8,
    circ: 2 * Math.PI,
    friction_s: 0.5,
    friction_k: 0.5,
    pole_f_r: 20000,
    da: Math.PI / 45,
    a_min: Math.PI / 3,
    a_max: 2 * Math.PI - Math.PI / 3,
    brakeScale: 8,
    bearKick: 70000
}


export class MotionSystem extends System {
    private player: Entity;
    private world: World;
    private ignoreInput: boolean;
    private playerCollisionTimestamp: number;
    private subscriptions: [string, (e:GameEvent)=>void][];

    constructor(engine: Engine, player: Entity) {
        super(engine);
        this.subscriptions = [
            ['PlayerHit', this.onPlayerHit.bind(this)],
            ['GoalReached', this.onGoalReached.bind(this)],
            ['MouseMove', this.onMouseMove.bind(this)],
            ['TouchStart', this.onTouchMove.bind(this)],
            ['TouchMove', this.onTouchMove.bind(this)],
            ['TouchEnd', this.onTouchEnd.bind(this)],
        ];
        this.player = player
        this.world = World.getInstance( engine );
        this.ignoreInput = false;
    }

    update(delta: number): void {
        //const dt = this.engine.pixiApp.ticker.deltaMS / 1000;

        const allDynamicEntities = this.getEntitiesBySignature( [PositionComponent, DynamicsComponent], [InputComponent, FollowComponent] );
        allDynamicEntities.forEach((entity: Entity, position: PositionComponent, dynamics: DynamicsComponent, input: InputComponent, follow: FollowComponent) => {
            if ( input ) {
                this.updateInputDynamicEntity( entity, input, position, dynamics );
            } else if ( follow ) {
                this.updateFollowEntity( entity, follow, position, dynamics );
            } else {
                this.updateDynamicEntity( entity, position, dynamics );
            }
        });

        let copyPositionEntities = this.getEntitiesBySignature([CopyPositionComponent, PositionComponent]);
        copyPositionEntities.forEach((entity: Entity, copycat: CopyPositionComponent, position: PositionComponent) => {
            this.updateCopyPositionEntity( entity, copycat, position );
        });
    }

    stage(): void {
        this.subscribeToEvents( this.subscriptions );
    }
    
    unstage(): void {
        this.unsubscribeToEvents( this.subscriptions );
    }

    cleanup(): void {}

    destroy(): void {}

    private updateDynamicEntity(entity: Entity, position: PositionComponent, dynamics: DynamicsComponent) {
        const world = World.getInstance( this.engine );
        const moving = dynamics.velocity.x !== 0 || dynamics.velocity.y !== 0;
        
        // acceleration
        dynamics.acceleration.x = dynamics.acceleration.x + dynamics.force.x / dynamics.mass;
        dynamics.acceleration.y = dynamics.acceleration.y + dynamics.force.y / dynamics.mass;
        // update velocity
        dynamics.velocity.x = dynamics.velocity.x + dynamics.acceleration.x * dt;
        dynamics.velocity.y = dynamics.velocity.y + dynamics.acceleration.y * dt;
        // update position
        position.x = metersToPixels( pixelsToMeters(this.world.toWorld(position).x) + dynamics.velocity.x * dt );
        position.y = metersToPixels( pixelsToMeters(this.world.toWorld(position).y) + dynamics.velocity.y * dt );
        const level = world.currentLevel;
        position.x = max( 0, min(level.pixelWidth-1, position.x) );
        position.y = max( 0, min(level.pixelHeight-1, position.y) );
        //reset forces
        dynamics.force.x = 0;
        dynamics.force.y = 0;
    }

    private updateInputDynamicEntity(entity: Entity, input: InputComponent, position: PositionComponent, dynamics: DynamicsComponent) {
        const world = World.getInstance( this.engine );
        const moving = dynamics.velocity.x !== 0 && dynamics.velocity.y !== 0;
        let friction = moving ? constants.friction_k : constants.friction_s;
        
        let poleF = {
            x: 0,
            y: 0
        };
        let frictionF = {
            x: 0,
            y: 0
        };
        
        // process user inputs
        if ( !this.ignoreInput ) {
            if ( input.left ) {
                // turn object left constants.da radians
                dynamics.angle = (dynamics.angle + constants.da) % constants.circ;
            } else if ( input.right ) {
                // turn object right constants.da radians
                dynamics.angle = (dynamics.angle - constants.da) % constants.circ;
            }
        }

        // brake increases friction
        friction *= constants.brakeScale;

        if (!this.ignoreInput && (input.space || input.mouseLeft)) {
            input.space = false;
            input.mouseLeft = false;
            // pole force
            poleF.x = friction * constants.pole_f_r * Math.cos(dynamics.angle);
            poleF.y = friction * constants.pole_f_r * Math.sin(dynamics.angle);
        }
        
        // add friction force opposite to object's velocity
        if (moving) {
            let vel_a = Math.atan2(dynamics.velocity.y, dynamics.velocity.x);
            frictionF.x = friction * dynamics.mass * constants.g * Math.cos(vel_a + Math.PI);
            frictionF.y = friction * dynamics.mass * constants.g * Math.sin(vel_a + Math.PI);
        }
        // sum forces
        let totalF = {
            x: poleF.x + frictionF.x + dynamics.force.x,
            y: poleF.y + frictionF.y + dynamics.force.y,
        };
        // acceleration
        dynamics.acceleration.x = totalF.x / dynamics.mass;
        dynamics.acceleration.y = totalF.y / dynamics.mass;
        // update velocity
        dynamics.velocity.x = dynamics.velocity.x + dynamics.acceleration.x * dt;
        dynamics.velocity.y = dynamics.velocity.y + dynamics.acceleration.y * dt;
        // update position
        position.x = metersToPixels( pixelsToMeters(this.world.toWorld(position).x) + dynamics.velocity.x * dt );
        position.y = metersToPixels( pixelsToMeters(this.world.toWorld(position).y) + dynamics.velocity.y * dt );
        const level = world.currentLevel;
        position.x = max( 0, min(level.pixelWidth-1, position.x) );
        position.y = max( 0, min(level.pixelHeight-1, position.y) );
        //reset forces
        dynamics.force.x = 0;
        dynamics.force.y = 0;
    }

    updateFollowEntity(entity: Entity, follow: FollowComponent, position: PositionComponent, dynamics: DynamicsComponent) {
        const world = World.getInstance( this.engine );
        const followed = <PositionComponent> this.getEntityComponentOfClass( PositionComponent, follow.entity );
        if ( position.type === 'world' && followed.type === 'world' ) {
            const now = Date.now();
            const moving = dynamics.velocity.x !== 0 && dynamics.velocity.y !== 0;
            let friction = moving ? constants.friction_k : constants.friction_s;
            
            let kickF = {
                x: 0,
                y: 0
            };
            let frictionF = {
                x: 0,
                y: 0
            };
            
            // turn object to followed position
            dynamics.angle = -(Math.atan2( followed.x - position.x, followed.y - position.y ) - Math.PI/2);
            friction *= constants.brakeScale;
            // bear kick!
            if ( follow.timestamp === undefined || now - follow.timestamp > 200 ) {
                kickF.x = friction * constants.bearKick * Math.cos(dynamics.angle);
                kickF.y = friction * constants.bearKick * Math.sin(dynamics.angle);
                follow.timestamp = now;
            }
            // add friction force opposite to object's velocity
            if (moving) {
                let vel_a = Math.atan2(dynamics.velocity.y, dynamics.velocity.x);
                frictionF.x = friction * dynamics.mass * constants.g * Math.cos(vel_a + Math.PI);
                frictionF.y = friction * dynamics.mass * constants.g * Math.sin(vel_a + Math.PI);
            }
            // sum forces
            let totalF = {
                x: kickF.x + frictionF.x,
                y: kickF.y + frictionF.y,
            };
            // acceleration
            dynamics.acceleration.x = totalF.x / dynamics.mass;
            dynamics.acceleration.y = totalF.y / dynamics.mass;
            // update velocity
            const vx_0 = dynamics.velocity.x;
            const vy_0 = dynamics.velocity.y;
            dynamics.velocity.x = dynamics.velocity.x + dynamics.acceleration.x * dt;
            dynamics.velocity.y = dynamics.velocity.y + dynamics.acceleration.y * dt;
            // update position
            position.x = metersToPixels( pixelsToMeters(this.world.toWorld(position).x) + dynamics.velocity.x * dt );
            position.y = metersToPixels( pixelsToMeters(this.world.toWorld(position).y) + dynamics.velocity.y * dt );
            const level = world.currentLevel;
            position.x = max( 0, min(level.pixelWidth-1, position.x) );
            position.y = max( 0, min(level.pixelHeight-1, position.y) );
        }
    }

    private updateCopyPositionEntity(entity: Entity, copycat: CopyPositionComponent, position: PositionComponent) {
        const followedPosition = <PositionComponent> this.getEntityComponentOfClass(PositionComponent, copycat.entity);
        if ( position.type === 'world' ) {
            position.x = this.world.toWorld( followedPosition ).x;
            position.y = this.world.toWorld( followedPosition ).y;
        } else if ( position.type === 'screen' ) {
            position.x = this.world.toScreen( followedPosition ).x;
            position.y = this.world.toScreen( followedPosition ).y;
        }
    }

    private onPlayerHit(ev: GameEvent) {
        const now = Date.now();
        if ( this.playerCollisionTimestamp ) {
            if ( now - this.playerCollisionTimestamp < 100 ) return;
        }
        this.playerCollisionTimestamp = Date.now();
        let playerDyn = <DynamicsComponent>  this.getEntityComponentOfClass(DynamicsComponent, this.player );
        playerDyn.velocity.x *= -0.5;
        playerDyn.velocity.y *= -0.5;
    }

    private onGoalReached() {
        this.ignoreInput = true;
    }

    private onMouseMove(event: GameEvent) {
        const world = World.getInstance( this.engine );
        const dynamicEntities = this.getEntitiesBySignature( [InputComponent, PositionComponent, DynamicsComponent], [] );
        dynamicEntities.forEach((entity: Entity, input: InputComponent, position: PositionComponent, dynamics: DynamicsComponent) => {
            const pos = world.toScreen( position );
            dynamics.angle = -(Math.atan2( event.msg.mouseEvent.clientX / this.engine.pixiApp.renderer.resolution - pos.x, event.msg.mouseEvent.clientY / this.engine.pixiApp.renderer.resolution - pos.y ) - Math.PI/2);
        });
    }

    private onTouchMove(event: GameEvent) {
        const world = World.getInstance( this.engine );
        const dynamicEntities = this.getEntitiesBySignature( [InputComponent, PositionComponent, DynamicsComponent], [] );
        dynamicEntities.forEach((entity: Entity, input: InputComponent, position: PositionComponent, dynamics: DynamicsComponent) => {
            const pos = world.toScreen( position );
            dynamics.angle = -(Math.atan2( event.msg.x - pos.x, event.msg.y - pos.y ) - Math.PI/2);
        });
    }

    private onTouchEnd(event: GameEvent) {
        const world = World.getInstance( this.engine );
        const dynamicEntities = this.getEntitiesBySignature( [InputComponent, PositionComponent, DynamicsComponent], [] );
        dynamicEntities.forEach((entity: Entity, input: InputComponent, position: PositionComponent, dynamics: DynamicsComponent) => {
            const moving = dynamics.velocity.x !== 0 && dynamics.velocity.y !== 0;
            let friction = (moving ? constants.friction_k : constants.friction_s) * constants.brakeScale;
            const pos = world.toScreen( position );
            dynamics.angle = -(Math.atan2( event.msg.x - pos.x, event.msg.y - pos.y ) - Math.PI/2);
            dynamics.force.x = friction * constants.pole_f_r * Math.cos( dynamics.angle );
            dynamics.force.y = friction * constants.pole_f_r * Math.sin( dynamics.angle );
        });
    }
}


export class CollisionSystem extends System {

    private quadtree: Quadtree;
    private worldWidth: number;
    private worldHeight: number;

    constructor(engine: Engine, worldWidth: number, worldHeight: number) {
        super(engine);
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
    }

    update(delta: number) {
        const world = World.getInstance( this.engine );
        this.quadtree = new Quadtree(0, { x: 0, y: 0, w: this.worldWidth, h: this.worldHeight });
        let collisionEntities = this.getEntitiesBySignature( [CollisionComponent, PositionComponent] );
        collisionEntities.forEach((entity: Entity, collision: CollisionComponent, position: PositionComponent) => {
            this.quadtree.insert(entity, {
                x: world.toWorld( position ).x + collision.box.x,
                y: world.toWorld( position ).y + collision.box.y,
                w: collision.box.w,
                h: collision.box.h
            });
        });

        this.quadtree.values.forEach(val => {
            const candidates = this.quadtree.retreive(val.box, []);
            candidates.forEach(candidate => {
                if (val.entity.id != candidate.entity.id) {
                    if (this.checkForCollision(val, candidate)) { this.publishEvent({
                            type: 'Collision',
                            msg: [val, candidate]
                        });
                    }
                }
            });
        });
    }

    stage(): void {
    }
    
    unstage(): void {
    }

    cleanup() {}

    destroy() {}

    checkForCollision(obj1: {entity: Entity, box: Box}, obj2: {entity: Entity, box: Box}): boolean {
        let xgap: number;
        let ygap: number;
        if (obj1.box.x < obj2.box.x) {
            xgap = obj2.box.x - obj1.box.x - obj1.box.w;
        } else {
            xgap = obj1.box.x - obj2.box.x - obj2.box.w;
        }
        if (obj1.box.y < obj2.box.y) {
            ygap = obj2.box.y - obj1.box.y - obj1.box.h;
        } else {
            ygap = obj1.box.y - obj2.box.y - obj2.box.h;
        }
        return xgap < 0 && ygap < 0;
    }
}