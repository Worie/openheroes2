/**
 * OpenHeroes2
 * 
 * This provider registers all services required by
 * editor.
 */

import Container from '../../Common/IOC/Container';
import EditorCore from './EditorCore';
import EditorStore from './EditorStore';
import EditorMapFactory from './EditorMapFactory';
import MapControl from '../Actions/MapControl';
import EditorBrushTilePipeline from '../Render/MapDisplay/EditorBrushTilePipeline';
import EditorGridPipeline from '../Render/MapDisplay/EditorGridPipeline';
import MapTerrainControl from '../Actions/MapTerrainControl';
import AutoBorder from '../Utils/AutoBorder/AutoBorder';
import AutoFixer from '../Utils/AutoBorder/AutoFixer';
import MapRiverControl from '../Actions/MapRiverControl';
import MapRoadControl from '../Actions/MapRoadControl';

export default function EditorProvider( container: Container ): void {
    container.bind( EditorCore );
    container.bind( EditorStore );
    container.bind( EditorMapFactory );
    container.bind( EditorBrushTilePipeline );
    container.bind( EditorGridPipeline );
    container.bind( MapControl );
    container.bind( MapTerrainControl );
    container.bind( MapRiverControl );
    container.bind( MapRoadControl );
    container.bind( AutoBorder );
    container.bind( AutoFixer );
}
