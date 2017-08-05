/**
 * OpenHeroes2
 * 
 * This class is responsible for drawing adventure map screen. It
 * is used both in editor and game itself and works on abstract way.
 * 
 * This class does not draw anything itself, instead you must pass
 * array of pipeline functions that are responsible for drawing particular
 * parts of screen, like tiles, rivers, roads, objects, etc.
 * 
 * It is implemented this way because render pipeline will be different
 * for editor and game, but still share some pipeline functions.
 * 
 * For example game does not need to display grid, editor does not need
 * to display current hero path arrows, but both of them have to display
 * terrains and objects.
 * 
 * As of rendering itself, we are going to create a function that creates
 * Pixi.Sprite's for every tile and object and such after a "redraw()".
 * After sprites on scene are prepared, they will be rendered continously
 * by Pixi.
 * 
 * When user moves camera slightly, we are moving whole scene on screen.
 * When camera is moved for a more than a 1 tile, it will become redrawn.
 * This way we can limit amount of recreating scene to only few times per
 * second (when scrolling) instead of 60 times per second.
 */

import * as Pixi from 'pixi.js';
import Injectable from '../../IOC/Injectable';
import Render from '../../Engine/Render/Render';
import Inject from '../../IOC/Inject';
import Container from '../../IOC/Container';
import IMap from '../../Model/IMap';
import Nullable from '../../Support/Nullable';
import IMapDisplayPipelineElement from './IMapDisplayPipelineElement';
import PerfCounter from '../../Support/PerfCounter';
import Tools from '../../Support/Tools';
import Point from '../../Types/Point';
import IMapDisplayMouse from './IMapDisplayMouse';
import MapDisplayMouseMoveFunction from './MapDisplayMouseMoveFunction';

@Injectable()
class MapDisplay {

    @Inject( Render )
    private gRender: Render;

    private fCanvas: HTMLCanvasElement;
    private fCameraPosition: Point = new Point( 0 , 0 );
    private fCameraDelta: Point = new Point( 0.000 , 0.000 );
    private fZoom: number = 1.000;
    private fPipeline: IMapDisplayPipelineElement[] = [];
    private fMapContainer: Nullable<Pixi.Container>;
    private fNeedRedraw: boolean = false;    
    private fMouse: IMapDisplayMouse = {
        realPosition: Point.zero() ,
        mapTilePosition: Point.zero() ,
        screenTilePosition: Point.zero() ,
        buttons: {
            left: false ,
            middle: false ,
            right: false ,
        }
    };
    private fOnMouseMove: MapDisplayMouseMoveFunction[] = [];

    /**
     * Creates and gets canvas for MapDisplay.
     * @param baseWidth width of canvas
     * @param baseHeight height of canvas
     */
    public createAndGetCanvas( baseWidth: number , baseHeight: number ): HTMLCanvasElement {
        this.fCanvas = this.gRender.getCanvas( baseWidth , baseHeight );
        this.fCanvas.addEventListener( 'mousemove' , (evt) => this.handleMouseMove(evt) );
        return this.fCanvas;
    }

    /**
     * Sets pipeline for map rendering.
     * @param pipeline array of pipeline functions
     */
    public setPipeline( pipeline: IMapDisplayPipelineElement[] ): void {
        this.fPipeline = pipeline;
    }

    /**
     * Forces MapDisplay to make full redraw on next frame.
     */
    public forceRedraw(): void {
        this.fNeedRedraw = true;
    }

    /**
     * Renders adventure map view into pixi container.
     * @param stage 
     */
    public render( stage: Pixi.Container ): void {

        // mapdisplay is active before canvas is initialized
        if ( !this.fCanvas ) {
            return;
        }

        // redraw map if user moved screen for over 1 tile,
        // or it hasnt been drawn yet or
        // we forced redraw using forceRedraw() function.
        const needsRedraw: boolean = ( 
            this.fCameraDelta.x < -1.000 ||
            this.fCameraDelta.y < -1.000 ||
            this.fCameraDelta.x > 1.000 || 
            this.fCameraDelta.y > 1.000 || 
            !this.fMapContainer || 
            this.fNeedRedraw 
        );

        if ( needsRedraw ) {
            // fully reinitialize pixi scene, destroying and
            // recreating all sprites
            const perfCounter: PerfCounter = new PerfCounter();
            this.normalizeCamera();
            this.redraw( stage );
            console.log( 'redraw time: ' , perfCounter.delta() );
        }

        // update container
        this.updateContainer();
        this.runUpdatePipeline();

    }

    /**
     * Returns size of tile for current zoom level.
     */
    private getTileSize(): number {
        return 32 / this.fZoom;
    }

    private normalizeCamera(): void {

        this.fCameraPosition.x += Math.trunc( this.fCameraDelta.x );
        this.fCameraPosition.y += Math.trunc( this.fCameraDelta.y );
        
        this.fCameraDelta.x = this.fCameraDelta.x % 1.000;
        this.fCameraDelta.y = this.fCameraDelta.y % 1.000;

    }

    /**
     * Redraws whole scene, destroying container and all sprites;
     * and then reinitializing them over.
     * @param stage
     */
    private redraw( stage: Pixi.Container ): void {

        // get tile size for current zoom
        const tileSize: number = this.getTileSize();

        // calculate bounds
        const startX: number = Math.floor( this.fCameraPosition.x - 2 );
        const startY: number = Math.floor( this.fCameraPosition.y - 2 );
        const endX: number = Math.floor( this.fCameraPosition.x ) + Math.ceil( this.fCanvas.width / tileSize ) + 2;
        const endY: number = Math.floor( this.fCameraPosition.y ) + Math.ceil( this.fCanvas.height / tileSize ) + 2;

        // erase old container
        if ( this.fMapContainer ) {
            stage.removeChild( this.fMapContainer );
            this.fMapContainer.destroy();
        }

        // create new container and add it to scene
        this.fMapContainer = new Pixi.Container();
        stage.addChild( this.fMapContainer );

        // notify pipelines that we are redrawing scene
        this.fPipeline.forEach( el => {
            if ( el.startRedraw ) {
                el.startRedraw();
            }
        } );

        // push container through rendering pipeline
        // iterating from bottom-right to top-left
        // on line basis
        for( let y = endY ; y >= startY ; --y ) {
            for ( let x = endX ; x >= startX ; --x ) {
                this.redrawTile( x , y , startX , startY );
            }
        }

        // make sure we wont force redraw next frame
        this.fNeedRedraw = false;

    }

    /**
     * Pushes target tile through rendering pipeline.
     * @param tileX x position of tile on map
     * @param tileY y position of tile on map
     * @param startX x position of tile on screen
     * @param startY y position of tile on screen
     */
    private redrawTile( tileX: number , tileY: number , startX: number , startY: number ): void {

        // prepare data
        const tileSize: number = this.getTileSize();
        const drawX: number = ( tileX - startX - 2 ) * tileSize;
        const drawY: number = ( tileY - startY - 2 ) * tileSize;
        const scale: number = tileSize / 32.000;

        // call pipeline functions
        this.fPipeline.forEach( el => el.redraw( this.fMapContainer! , tileX , tileY , drawX , drawY , scale ) );

    }

    private runUpdatePipeline(): void {
        const tileSize: number = this.getTileSize();
        const scale: number = tileSize / 32.000;
        this.fPipeline.forEach( el => {
            if ( el.update ) {
                el.update( this.fMapContainer! , this.fCameraPosition.x , this.fCameraPosition.y , tileSize , scale );
            }
        } );
    }

    /**
     * Updates container without redrawing it fully; when camera is moved for a less than 1 tile,
     * we are moving container on screen for performance reasons.
     */
    private updateContainer(): void {

        const tileSize: number = this.getTileSize();
        const container: Pixi.Container = this.fMapContainer!;

        container.x = Math.floor( -this.fCameraDelta.x * tileSize );
        container.y = Math.floor( -this.fCameraDelta.y * tileSize );

    }

    public moveMap( offsetX: number , offsetY: number ): void {
        this.fCameraDelta.x += offsetX;
        this.fCameraDelta.y += offsetY;
    }

    public getZoom(): number {
        return this.fZoom;
    }

    public changeZoom( zoomDelta: number ): void {
        const centerPos: Point = this.getCenterPos();
        this.fZoom = Tools.clamp( this.fZoom + zoomDelta , { min: 0.100 , max: 4.000 } );
        this.centerAt( centerPos.x , centerPos.y );
    }

    public getCenterPos(): Point {

        // calculate width of screen in tiles (1 unit = 1 tile)
        const tileSize: number = this.getTileSize();
        const amountOfTilesX: number = this.fCanvas.width / tileSize;
        const amountOfTilesY: number = this.fCanvas.height / tileSize;

        // get camera top-left corner
        const cameraPosX: number = this.fCameraPosition.x + this.fCameraDelta.x;
        const cameraPosY: number = this.fCameraPosition.y + this.fCameraDelta.y;

        // get point in middle of this range
        return new Point( 
            cameraPosX + ( amountOfTilesX / 2.000 ) ,
            cameraPosY + ( amountOfTilesY / 2.000 )
        );

    }

    public centerAt( x: number , y: number ): void {

        // calculate width of screen in tiles (1 unit = 1 tile)
        const tileSize: number = this.getTileSize();
        const amountOfTilesX: number = this.fCanvas.width / tileSize;
        const amountOfTilesY: number = this.fCanvas.height / tileSize;

        const targetCameraX: number = x - ( amountOfTilesX / 2.000 );
        const targetCameraY: number = y - ( amountOfTilesY / 2.000 );

        this.fCameraPosition.x = Math.trunc( targetCameraX );
        this.fCameraPosition.y = Math.trunc( targetCameraY );

        this.fCameraDelta.x = targetCameraX % 1.000;
        this.fCameraDelta.y = targetCameraY % 1.000;

        this.forceRedraw();

    }

    public getMouse(): Readonly<IMapDisplayMouse> {
        return this.fMouse;
    }

    private handleMouseMove( evt: MouseEvent ): void {

        // calculate real mouse pos on screen
        const boundingRect: ClientRect = this.fCanvas.getBoundingClientRect();
        const posX: number = evt.clientX - boundingRect.left;
        const posY: number = evt.clientY - boundingRect.top;

        // calculate width of screen in tiles (1 unit = 1 tile)
        // @TODO: cache this value? its abused a lot on all functions there...
        const tileSize: number = this.getTileSize();
        
        // store real mouse position on canvas
        this.fMouse.realPosition.x = posX;
        this.fMouse.realPosition.y = posY;

        // calculate screen tile position on canvas
        this.fMouse.screenTilePosition.x = Math.floor( (posX + this.fCameraDelta.x*tileSize) / tileSize );
        this.fMouse.screenTilePosition.y = Math.floor( (posY + this.fCameraDelta.y*tileSize) / tileSize );

        // calculate map tile position on canvas
        this.fMouse.mapTilePosition.x = this.fMouse.screenTilePosition.x + this.fCameraPosition.x;
        this.fMouse.mapTilePosition.y = this.fMouse.screenTilePosition.y + this.fCameraPosition.y;

        // get buttons that we are pressing, grabbing them from evt.buttons;
        // they are stored as bit flags
        const BTN_LEFT      = 1;
        const BTN_RIGHT     = 2;
        const BTN_MIDDLE    = 4;

        this.fMouse.buttons.left = ( ( evt.buttons & BTN_LEFT ) == BTN_LEFT );
        this.fMouse.buttons.middle = ( ( evt.buttons & BTN_MIDDLE ) == BTN_MIDDLE );
        this.fMouse.buttons.right = ( ( evt.buttons & BTN_RIGHT ) == BTN_RIGHT );

        this.fOnMouseMove.forEach( fn => fn(this.fMouse) );

    }

    public onMouseMove( handler: MapDisplayMouseMoveFunction ): void {
        this.fOnMouseMove.push( handler );
    }

}

export default MapDisplay;
