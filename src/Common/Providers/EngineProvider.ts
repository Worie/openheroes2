import Container from '../IOC/Container';
import Agg from '../Engine/Data/Agg';
import Pal from '../Engine/Data/Pal';
import Engine from '../Engine/Engine';
import BinaryFile from '../Engine/Files/BinaryFile';
import Files from '../Engine/Files/Files';
import GraphicsLoader from '../Engine/Graphics/GraphicsLoader';
import Icn from '../Engine/Data/Icn';
import Til from '../Engine/Data/Til';
import Snd from '../Engine/Data/Snd';
import AudioLoader from '../Engine/Graphics/AudioLoader';

export default function EngineProvider( container: Container ): void {
    container.bind( Agg );
    container.bind( Pal );
    container.bind( Icn );
    container.bind( Til );
    container.bind( Snd );
    container.bind( Engine );
    container.bind( BinaryFile );
    container.bind( Files );
    container.bind( GraphicsLoader );
    container.bind( AudioLoader );
}
