
import Injectable from '../../../Common/IOC/Injectable';
import Inject from '../../../Common/IOC/Inject';
import EditorStore from '../../Core/EditorStore';
import Point from '../../../Common/Types/Point';
import WaterBorders from './WaterBorders';
import Nullable from '../../../Common/Support/Nullable';
import ITile from '../../../Common/Model/ITile';
import Arrays from '../../../Common/Support/Arrays';
import IAutoBorderProcessor from './IAutoBorderProcessor';
import TerrainOuterBorders from './TerrainOuterBorders';
import TerrainJunctionBorders from './TerrainJunctionBorders';
import TerrainData from '../../../Common/Game/Terrain/TerrainData';
import TerrainMultiBorders from './TerrainMultiBorders';

@Injectable()
class AutoBorder {

    @Inject( EditorStore )
    private gStore: EditorStore;

    public borderizeMapSection( fromPos: Point , toPos: Point ): void {

        for( let x = fromPos.x + 1 ; x <= toPos.x - 1 ; ++x ) {
            for( let y = fromPos.y + 1 ; y <= toPos.y - 1 ; ++y ) {
                this.reinitTile( x , y );
            }
        }

        for( let x = fromPos.x ; x <= toPos.x ; ++x ) {
            for( let y = fromPos.y ; y <= toPos.y ; ++y ) {
                this.borderizeTile( x , y );
            }
        }

    }

    public reinitTile( x: number , y: number ): void {
        const tile: Nullable<ITile> = this.gStore.map.getMapTileOrNull( x , y );
        if ( tile ) {
            this.gStore.map.setTileTerrain(
                tile.x ,
                tile.y ,
                tile.terrain ,
                Arrays.randomElement( TerrainData[ tile.terrain ].basicTiles )
            );
        }
    }

    public borderizeTile( x: number , y: number ): void {

        const processors: IAutoBorderProcessor[] = [
            WaterBorders ,
            ...TerrainOuterBorders ,
            ...TerrainJunctionBorders ,
            ...TerrainMultiBorders ,
        ];

        processors.forEach( processor => this.borderizeWith( x , y , processor ) );

    }

    private getMatrixPoint( i: number ): Point {
        return new Point( i % 3 , Math.floor( i / 3.00 ) );
    }

    private borderizeWith( x: number , y: number , processor: IAutoBorderProcessor ): void {

        processor.matchers.forEach( matcher => {

            for( let i = 0 ; i < 9 ; ++i ) {
                
                const point: Point = this.getMatrixPoint( i );

                if ( this.gStore.map.isValidTile( point.x + x , point.y + y ) ) {                
                    const tile: ITile = this.gStore.map.getMapTile( point.x + x , point.y + y );
                    const source = processor.sources[ matcher.in[i] ];
                
                    if ( !source( tile.terrain ) ) {
                        return;
                    }

                } else {

                    const source = processor.sources[ matcher.in[i] ];
                    if ( !source( null ) ) {
                        return;
                    }

                }

            }

            for( let i = 0 ; i < 9 ; ++i ) {

                const point: Point = this.getMatrixPoint( i );

                if ( this.gStore.map.isValidTile( point.x + x , point.y + y ) ) {
                    const tile: ITile = this.gStore.map.getMapTile( point.x + x , point.y + y )!;

                    const output = processor.outputs[ matcher.out[i] ];
                    if ( output ) {
                        this.gStore.map.setTileTerrain(
                            tile.x , 
                            tile.y ,
                            tile.terrain ,
                            Arrays.randomElement( output.sprites ) ,
                            output.mirror ,
                            output.flip ,
                        );
                    }
                }

            }

        } );


    }

}

export default AutoBorder;
