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

export default function EditorProvider( container: Container ): void {
    container.bind( EditorCore );
    container.bind( EditorStore );
    container.bind( EditorMapFactory );
}
