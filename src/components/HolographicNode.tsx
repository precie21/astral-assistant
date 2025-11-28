import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface HolographicNodeProps {
    state: 'idle' | 'listening' | 'thinking' | 'speaking';
    isListening: boolean;
}

function HolographicOrb({ state }: { state: string }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.005;
            meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
        }

        if (materialRef.current) {
            materialRef.current.uniforms.time.value = state.clock.elapsedTime;
        }
    });

    const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

    const fragmentShader = `
    uniform float time;
    uniform vec3 color1;
    uniform vec3 color2;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      // Fresnel effect
      vec3 viewDirection = normalize(cameraPosition - vPosition);
      float fresnel = pow(1.0 - dot(viewDirection, vNormal), 3.0);
      
      // Animated color shift
      vec3 color = mix(color1, color2, sin(time * 0.5 + vPosition.y) * 0.5 + 0.5);
      
      // Holographic glow
      float glow = fresnel * (sin(time * 2.0) * 0.3 + 0.7);
      
      gl_FragColor = vec4(color * glow, fresnel * 0.8);
    }
  `;

    const uniforms = {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x00f0ff) }, // Cyan
        color2: { value: new THREE.Color(0xb24bf3) }, // Purple
    };

    return (
        <Sphere ref={meshRef} args={[1, 64, 64]}>
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent
                side={THREE.DoubleSide}
            />
        </Sphere>
    );
}

export default function HolographicNode({ state, isListening }: HolographicNodeProps) {
    const [isHovered, setIsHovered] = useState(false);

    const handleClick = () => {
        console.log('Orb clicked - voice recording will be implemented');
        // TODO: Implement voice recording
    };

    return (
        <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
        >
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <HolographicOrb state={state} />
                <OrbitControls enableZoom={false} enablePan={false} />
            </Canvas>

            {/* Particle ring effect */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-cyber-cyan rounded-full"
                        style={{
                            top: '50%',
                            left: '50%',
                            transform: `rotate(${i * 30}deg) translateY(-120px)`,
                            animation: `float 3s ease-in-out infinite`,
                            animationDelay: `${i * 0.1}s`,
                            opacity: isListening ? 1 : 0.3,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
