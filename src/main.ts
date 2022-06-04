import { Engine, StateTransitionDescription } from 'fosfeno';
import * as states from './state/states';


declare let window: any;

window.addEventListener('load', function () {
    console.log('window: ', window.innerWidth, window.innerHeight)
    var engine = new Engine({
        pixiProperties: {
            width: 768,
            height: 960,
            resizeTo: null,
            resolution: 1,
            antialias: true,
            backgroundColor: 0xffffff,
        }
    });
    let container = document.getElementById('container');
    container.appendChild( engine.pixiApp.view );
    
    //const resize = (function (e: Event) {
    //    this.pixiApp.renderer.resize( window.innerWidth, window.innerHeight );
    //}).bind(engine);
    //window.addEventListener('resize', resize);

    const sts: StateTransitionDescription = {
        start: 'StartLevelState',
        startLoadResources: true,
        transitions: [
            {
                current:        'StartLevelState',
                event:          'StartLevel',
                next:           'RandomLevelState',
                destroyCurrent: true,
                forceNewNext:   true,
                resetEngine:    false,
                loadResources:  false
            },
            {
                current:        'RandomLevelState',
                event:          'Reset',
                next:           'StartLevelState',
                destroyCurrent: true,
                forceNewNext:   true,
                resetEngine:    true,
                loadResources:  true
            },
            {
                current:        'RandomLevelState',
                event:          'Pause',
                next:           'PauseState',
                destroyCurrent: false,
                forceNewNext:   true,
                resetEngine:    false,
                loadResources:  false
            },
            {
                current:        'PauseState',
                event:          'Reset',
                next:           'StartLevelState',
                destroyCurrent: true,
                forceNewNext:   true,
                resetEngine:    true,
                loadResources:  true
            },
            {
                current:        'PauseState',
                event:          'Pause',
                next:           'RandomLevelState',
                destroyCurrent: true,
                forceNewNext:   false,
                resetEngine:    false,
                loadResources:  false
            },
            {
                current:        'RandomLevelState',
                event:          'GoalReached',
                next:           'GoalReachedState',
                destroyCurrent: false,
                forceNewNext:   true,
                resetEngine:    false,
                loadResources:  false
            },
            {
                current:        'GoalReachedState',
                event:          'NextLevel',
                next:           'StartLevelState',
                destroyCurrent: true,
                forceNewNext:   true,
                resetEngine:    true,
                loadResources:  true
            },
            {
                current:        'RandomLevelState',
                event:          'PlayerDied',
                next:           'PlayerDiedState',
                destroyCurrent: false,
                forceNewNext:   true,
                resetEngine:    false,
                loadResources:  false
            },
            {
                current:        'PlayerDiedState',
                event:          'Reset',
                next:           'StartLevelState',
                destroyCurrent: true,
                forceNewNext:   true,
                resetEngine:    true,
                loadResources:  true
            },
        ]
    };

    engine.setTransitionSystem( sts, states );
    engine.start();
    window.engine = engine;
    console.log( `renderer dimensions: (${engine.pixiApp.renderer.width}, ${engine.pixiApp.renderer.height}), resolution: ${engine.pixiApp.renderer.resolution}` );
});