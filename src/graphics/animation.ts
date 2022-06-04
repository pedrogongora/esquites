import * as PIXI from 'pixi.js';
import { Entity, Engine, EntitySignature } from 'fosfeno';
import { SpriteComponent, SpriteAnimation, AnimationsComponent } from '../components';
import { EasingFunction } from './easing';


export class AnimationHelper {

    private engine: Engine;
    private log: (...args:any)=>void;
    private time: number;
    private numLogs = 0;
    private logAllowed = false;

    constructor(engine: Engine, log?: (...args:any)=>void) {
        this.engine = engine;
        this.log = (...args:any) => {
            const logger = log ? log : (...args:any)=>{};
            const now = Date.now();
            if ( this.logAllowed || this.time === undefined || now - this.time > 500 ) {
                logger('['+now+','+(this.numLogs)+']: ',...args);
                if ( this.time === undefined || now - this.time > 500 ) {
                    this.time = now;
                    this.logAllowed = true;
                }
            }
        };
    }

    public updateAnimations(animations: EntitySignature) {
        const now = Date.now();
        this.numLogs++;

        animations.forEach((entity: Entity, animations: AnimationsComponent, sprite: SpriteComponent) => {
            this.log('------------> update anims:\n' + animations);
            animations.animations.forEach((animation: SpriteAnimation) => {
                this.initIfNew( now, animation );
                this.updateCurrentStep( now, animation, sprite );
                this.applyStep( now, animation, sprite );
            });
        });

        this.logAllowed = false;
    }

    private initIfNew(now: number, animation: SpriteAnimation) {
        if ( animation.off ) return;
        if ( animation.iterationsLeft === undefined || animation.totalDuration === undefined || animation.startTime === undefined || animation.currentStep === undefined ) {
            this.log('init anim')
            animation.iterations = animation.iterations ? animation.iterations : 1;
            animation.iterationsLeft = animation.iterationsLeft ? animation.iterationsLeft : animation.iterations;
            const totalDuration = 
                animation.steps
                .map( a => { return a.duration; } )
                .reduce( (prev,curr)=>{ return prev + curr }, 0  );
            animation.totalDuration = totalDuration;
            animation.startTime = now;
            animation.currentStep = 0;
            if ( animation.off === undefined ) {
                animation.off = false;
            }
        }
    }

    private computeDT(now: number, animation: SpriteAnimation) {
        let completedTime = 0;
        for ( let i = 0; i < animation.currentStep; i++ ) {
            completedTime += animation.steps[i].duration;
        }
        const dt = now - animation.startTime - completedTime;
        return dt;
    }

    private updateCurrentStep(now: number, animation: SpriteAnimation, sprite: SpriteComponent) {
        if ( animation.off ) return;
        const dt = this.computeDT( now, animation );
        let step = animation.steps[animation.currentStep];
        // did we missed finishing the previous step?
        if ( dt >= step.duration ) {
            this.log('finishing the previous step');
            sprite[step.property] = step.to;
            animation.currentStep += 1;
            // if finished last step, restart or reset
            if ( animation.currentStep >= animation.steps.length ) {
                animation.startTime = now;
                animation.currentStep = 0;
                if (  animation.iterationsLeft > 1 ) {
                    animation.iterationsLeft -= 1;
                } else if ( animation.loop ) {
                    animation.iterationsLeft = animation.iterations;
                } else {
                    animation.startTime = undefined;
                    animation.iterationsLeft = undefined;
                    animation.totalDuration = undefined;
                    animation.currentStep = undefined;
                    animation.off = true;
                    if ( animation.onFinishMessage !== undefined ) {
                        this.engine.eventQueue.publish( animation.onFinishMessage );
                    }
                }
            }
        }
    }

    private applyStep(now: number, animation: SpriteAnimation, sprite: SpriteComponent) {
        if ( animation.off ) return;
        this.log('step: ' + animation.currentStep);
        const dt = this.computeDT( now, animation );
        const step = animation.steps[animation.currentStep];
        if( step.property === 'current' ) {
            sprite['current'] = step.from;
        } else if ( step.property === 'tint' ) {
            const r1 = step.from >>> 16,
                  g1 = (step.from << 16) >>> 24,
                  b1 = (step.from << 24) >>> 24,
                  r2 = step.to >>> 16,
                  g2 = (step.to << 16) >>> 24,
                  b2 = (step.to << 24) >>> 24;
            let r3 = r1 < r2
                ? EasingFunction.functions[step.easing](dt, r1, r2 - r1, step.duration)
                : EasingFunction.functions[step.easing](dt, -r1, r1 - r2, step.duration);
            let g3 = g1 < g2
                ? EasingFunction.functions[step.easing](dt, g1, g2 - g1, step.duration)
                : EasingFunction.functions[step.easing](dt, -g1, g1 - g2, step.duration);
            let b3 = b1 < b2
                ? EasingFunction.functions[step.easing](dt, b1, b2 - b1, step.duration)
                : EasingFunction.functions[step.easing](dt, -b1, b1 - b2, step.duration);
            r3 = Math.floor( r1 < r2 ? r3 : -r3 );
            g3 = Math.floor( g1 < g2 ? g3 : -g3 );
            b3 = Math.floor( b1 < b2 ? b3 : -b3 );
            const value = (r3 << 16) + (g3 << 8) + b3;
            sprite[step.property] = value;
            this.log( dt,' (',r1,g1,b1,') -- (',r2,g2,b2,') == (',r3,g3,b3,') = ', value.toString(16) );
        } else {
            let value = step.from < step.to
                ? EasingFunction.functions[step.easing](dt,  step.from, step.to - step.from, step.duration)
                : EasingFunction.functions[step.easing](dt, -step.from, step.from - step.to, step.duration);
            value = step.from < step.to
                ? value
                : -value;
            this.log('applying anim (dt,from,to,duration,value):', dt, step.from, step.to, step.duration, value);
            sprite[step.property] = value;
        }
    }
}