import { type ReactElement, useState, useCallback } from "react";
import { Block } from "@/components/templates";
import { StackLayout, SplitLayout, GridLayout } from "@/components/layouts";
import {
    EditableH1,
    EditableH2,
    EditableParagraph,
    InlineClozeInput,
    InlineClozeChoice,
    InlineFeedback,
    InlineTooltip,
} from "@/components/atoms";
import { InteractionHintSequence } from "@/components/atoms/visual/InteractionHint";
import {
    getVariableInfo,
    clozePropsFromDefinition,
    choicePropsFromDefinition,
} from "../variables";
import { useVar, useSetVar } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// INTERACTIVE PLAY-DOUGH VISUALIZATION
// ═══════════════════════════════════════════════════════════════════════════

function PlayDoughShape() {
    const [corners, setCorners] = useState([
        { x: 150, y: 80 },   // top
        { x: 220, y: 150 },  // right
        { x: 150, y: 220 },  // bottom
        { x: 80, y: 150 },   // left
    ]);
    const [dragging, setDragging] = useState<number | null>(null);
    const [hasInteracted, setHasInteracted] = useState(false);

    const handleMouseDown = useCallback((index: number) => (e: React.MouseEvent) => {
        e.preventDefault();
        setDragging(index);
        setHasInteracted(true);
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        if (dragging === null) return;
        const svg = e.currentTarget;
        const rect = svg.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 300;
        const y = ((e.clientY - rect.top) / rect.height) * 300;

        // Clamp to reasonable bounds
        const clampedX = Math.max(30, Math.min(270, x));
        const clampedY = Math.max(30, Math.min(270, y));

        setCorners(prev => {
            const newCorners = [...prev];
            newCorners[dragging] = { x: clampedX, y: clampedY };
            return newCorners;
        });
    }, [dragging]);

    const handleMouseUp = useCallback(() => {
        setDragging(null);
    }, []);

    // Create a smooth curved path through all corners
    const createBlobPath = () => {
        const cx = 150;
        const cy = 150;

        // Generate more points for a smoother blob
        const points: { x: number; y: number }[] = [];
        const numPoints = 32;

        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;

            // Find the two nearest corner influences
            const cornerAngle0 = Math.atan2(corners[0].y - cy, corners[0].x - cx);
            const cornerAngle1 = Math.atan2(corners[1].y - cy, corners[1].x - cx);
            const cornerAngle2 = Math.atan2(corners[2].y - cy, corners[2].x - cx);
            const cornerAngle3 = Math.atan2(corners[3].y - cy, corners[3].x - cx);

            // Calculate distance from center for each corner
            const d0 = Math.sqrt((corners[0].x - cx) ** 2 + (corners[0].y - cy) ** 2);
            const d1 = Math.sqrt((corners[1].x - cx) ** 2 + (corners[1].y - cy) ** 2);
            const d2 = Math.sqrt((corners[2].x - cx) ** 2 + (corners[2].y - cy) ** 2);
            const d3 = Math.sqrt((corners[3].x - cx) ** 2 + (corners[3].y - cy) ** 2);

            // Weighted interpolation based on angle proximity
            const angleDiff = (a1: number, a2: number) => {
                let diff = a1 - a2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                return Math.abs(diff);
            };

            const w0 = Math.max(0, 1 - angleDiff(angle, cornerAngle0) / Math.PI);
            const w1 = Math.max(0, 1 - angleDiff(angle, cornerAngle1) / Math.PI);
            const w2 = Math.max(0, 1 - angleDiff(angle, cornerAngle2) / Math.PI);
            const w3 = Math.max(0, 1 - angleDiff(angle, cornerAngle3) / Math.PI);

            const totalWeight = w0 + w1 + w2 + w3 || 1;
            const radius = (d0 * w0 + d1 * w1 + d2 * w2 + d3 * w3) / totalWeight;

            points.push({
                x: cx + Math.cos(angle) * radius,
                y: cy + Math.sin(angle) * radius,
            });
        }

        // Create smooth bezier curve
        let path = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length; i++) {
            const p0 = points[(i - 1 + points.length) % points.length];
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            const p3 = points[(i + 2) % points.length];

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }

        return path;
    };

    // Cute face expression based on stretch
    const getStretchAmount = () => {
        const width = Math.abs(corners[1].x - corners[3].x);
        const height = Math.abs(corners[2].y - corners[0].y);
        return { width, height, ratio: width / height };
    };

    const stretch = getStretchAmount();
    const isStretched = stretch.ratio > 1.5 || stretch.ratio < 0.67;

    return (
        <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4">
            <svg
                viewBox="0 0 300 300"
                className="w-full max-w-[300px] mx-auto cursor-grab active:cursor-grabbing"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Soft shadow */}
                <ellipse
                    cx="150"
                    cy="260"
                    rx={Math.max(40, stretch.width / 3)}
                    ry="15"
                    fill="rgba(0,0,0,0.1)"
                />

                {/* Main blob shape */}
                <path
                    d={createBlobPath()}
                    fill="#F8A0CD"
                    stroke="#E879A9"
                    strokeWidth="3"
                    style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
                />

                {/* Face - eyes */}
                <ellipse cx="125" cy="140" rx="12" ry={isStretched ? 8 : 14} fill="white" />
                <ellipse cx="175" cy="140" rx="12" ry={isStretched ? 8 : 14} fill="white" />
                <circle cx="127" cy="142" r="6" fill="#333" />
                <circle cx="177" cy="142" r="6" fill="#333" />
                <circle cx="129" cy="140" r="2" fill="white" />
                <circle cx="179" cy="140" r="2" fill="white" />

                {/* Mouth - changes based on stretch */}
                {isStretched ? (
                    // Surprised/stretched face
                    <ellipse cx="150" cy="175" rx="15" ry="10" fill="#E879A9" />
                ) : (
                    // Happy smile
                    <path
                        d="M 130 170 Q 150 190 170 170"
                        fill="none"
                        stroke="#E879A9"
                        strokeWidth="4"
                        strokeLinecap="round"
                    />
                )}

                {/* Cheek blush */}
                <ellipse cx="105" cy="160" rx="12" ry="8" fill="rgba(255,150,150,0.4)" />
                <ellipse cx="195" cy="160" rx="12" ry="8" fill="rgba(255,150,150,0.4)" />

                {/* Draggable corner handles */}
                {corners.map((corner, i) => (
                    <g key={i}>
                        <circle
                            cx={corner.x}
                            cy={corner.y}
                            r="18"
                            fill="rgba(98, 208, 173, 0.3)"
                            className="cursor-grab"
                        />
                        <circle
                            cx={corner.x}
                            cy={corner.y}
                            r="12"
                            fill="#62D0AD"
                            stroke="white"
                            strokeWidth="3"
                            className="cursor-grab hover:scale-110 transition-transform"
                            onMouseDown={handleMouseDown(i)}
                            style={{ cursor: dragging === i ? 'grabbing' : 'grab' }}
                        />
                    </g>
                ))}
            </svg>

            {/* Interaction hint */}
            {!hasInteracted && (
                <InteractionHintSequence
                    hintKey="playdough-drag"
                    steps={[
                        {
                            gesture: "drag",
                            label: "Drag the green dots!",
                            position: { x: "73%", y: "50%" },
                        },
                    ]}
                />
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHAPE COMPARISON GRID - Ball vs Donut
// ═══════════════════════════════════════════════════════════════════════════

function ShapeComparisonGrid() {
    return (
        <div className="grid grid-cols-2 gap-6 p-4">
            {/* Ball / No Hole shapes */}
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-6 text-center">
                <div className="text-lg font-bold text-teal-700 mb-4">No Holes</div>
                <div className="flex justify-center gap-4 flex-wrap">
                    {/* Ball */}
                    <div className="flex flex-col items-center">
                        <svg viewBox="0 0 80 80" className="w-16 h-16">
                            <circle cx="40" cy="40" r="30" fill="#62D0AD" />
                            <ellipse cx="32" cy="32" rx="8" ry="6" fill="rgba(255,255,255,0.4)" />
                        </svg>
                        <span className="text-sm text-teal-600 mt-1">Ball</span>
                    </div>
                    {/* Snake */}
                    <div className="flex flex-col items-center">
                        <svg viewBox="0 0 80 80" className="w-16 h-16">
                            <path
                                d="M 15 40 Q 30 20 45 40 Q 60 60 75 40"
                                fill="none"
                                stroke="#62D0AD"
                                strokeWidth="12"
                                strokeLinecap="round"
                            />
                        </svg>
                        <span className="text-sm text-teal-600 mt-1">Snake</span>
                    </div>
                    {/* Pancake */}
                    <div className="flex flex-col items-center">
                        <svg viewBox="0 0 80 80" className="w-16 h-16">
                            <ellipse cx="40" cy="45" rx="32" ry="12" fill="#62D0AD" />
                            <ellipse cx="35" cy="42" rx="10" ry="4" fill="rgba(255,255,255,0.3)" />
                        </svg>
                        <span className="text-sm text-teal-600 mt-1">Pancake</span>
                    </div>
                    {/* Egg */}
                    <div className="flex flex-col items-center">
                        <svg viewBox="0 0 80 80" className="w-16 h-16">
                            <ellipse cx="40" cy="42" rx="22" ry="28" fill="#62D0AD" />
                            <ellipse cx="34" cy="32" rx="6" ry="8" fill="rgba(255,255,255,0.4)" />
                        </svg>
                        <span className="text-sm text-teal-600 mt-1">Egg</span>
                    </div>
                </div>
                <div className="mt-4 text-teal-600 text-sm">
                    These can all become each other!
                </div>
            </div>

            {/* Donut / One Hole shapes */}
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-6 text-center">
                <div className="text-lg font-bold text-rose-700 mb-4">One Hole</div>
                <div className="flex justify-center gap-4 flex-wrap">
                    {/* Donut */}
                    <div className="flex flex-col items-center">
                        <svg viewBox="0 0 80 80" className="w-16 h-16">
                            <circle cx="40" cy="40" r="28" fill="#F8A0CD" />
                            <circle cx="40" cy="40" r="12" fill="white" />
                            <ellipse cx="30" cy="32" rx="6" ry="4" fill="rgba(255,255,255,0.4)" />
                        </svg>
                        <span className="text-sm text-rose-600 mt-1">Donut</span>
                    </div>
                    {/* Coffee cup */}
                    <div className="flex flex-col items-center">
                        <svg viewBox="0 0 80 80" className="w-16 h-16">
                            <rect x="18" y="25" width="35" height="40" rx="4" fill="#F8A0CD" />
                            <path
                                d="M 53 32 Q 68 32 68 45 Q 68 58 53 58"
                                fill="none"
                                stroke="#F8A0CD"
                                strokeWidth="6"
                            />
                            <ellipse cx="35" cy="25" rx="17" ry="4" fill="#E879A9" />
                        </svg>
                        <span className="text-sm text-rose-600 mt-1">Cup</span>
                    </div>
                    {/* Bracelet */}
                    <div className="flex flex-col items-center">
                        <svg viewBox="0 0 80 80" className="w-16 h-16">
                            <ellipse cx="40" cy="40" rx="28" ry="20" fill="none" stroke="#F8A0CD" strokeWidth="10" />
                        </svg>
                        <span className="text-sm text-rose-600 mt-1">Bracelet</span>
                    </div>
                </div>
                <div className="mt-4 text-rose-600 text-sm">
                    These all have exactly one hole!
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPOSSIBLE TRANSFORMATION VISUAL
// ═══════════════════════════════════════════════════════════════════════════

function ImpossibleTransformation() {
    return (
        <div className="flex items-center justify-center gap-4 p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl">
            {/* Ball */}
            <div className="text-center">
                <svg viewBox="0 0 100 100" className="w-20 h-20">
                    <circle cx="50" cy="50" r="35" fill="#62D0AD" />
                    <ellipse cx="40" cy="40" rx="10" ry="8" fill="rgba(255,255,255,0.4)" />
                    {/* Happy face */}
                    <circle cx="40" cy="45" r="4" fill="#333" />
                    <circle cx="60" cy="45" r="4" fill="#333" />
                    <path d="M 40 60 Q 50 70 60 60" fill="none" stroke="#333" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <div className="text-sm text-slate-600 mt-2 font-medium">Ball</div>
            </div>

            {/* Arrow with X */}
            <div className="flex flex-col items-center">
                <svg viewBox="0 0 80 50" className="w-16 h-10">
                    <path
                        d="M 10 25 L 55 25 M 45 15 L 55 25 L 45 35"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {/* X mark */}
                    <circle cx="35" cy="25" r="12" fill="white" stroke="#ef4444" strokeWidth="2" />
                    <path d="M 30 20 L 40 30 M 40 20 L 30 30" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <div className="text-xs text-red-500 font-bold">NO!</div>
            </div>

            {/* Donut */}
            <div className="text-center">
                <svg viewBox="0 0 100 100" className="w-20 h-20">
                    <circle cx="50" cy="50" r="35" fill="#F8A0CD" />
                    <circle cx="50" cy="50" r="14" fill="white" />
                    <ellipse cx="38" cy="38" rx="8" ry="6" fill="rgba(255,255,255,0.4)" />
                    {/* Confused face */}
                    <circle cx="35" cy="45" r="4" fill="#333" />
                    <circle cx="65" cy="45" r="4" fill="#333" />
                    <ellipse cx="50" cy="62" rx="6" ry="4" fill="#E879A9" />
                </svg>
                <div className="text-sm text-slate-600 mt-2 font-medium">Donut</div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SORTING GAME - Drag shapes into boxes
// ═══════════════════════════════════════════════════════════════════════════

function SortingGame() {
    const setVar = useSetVar();
    const [sorted, setSorted] = useState<{ noHole: string[]; oneHole: string[] }>({
        noHole: [],
        oneHole: [],
    });
    const [available, setAvailable] = useState(['star', 'pretzel', 'cube', 'ring']);

    const shapes: Record<string, { hasHole: boolean; element: JSX.Element }> = {
        star: {
            hasHole: false,
            element: (
                <svg viewBox="0 0 60 60" className="w-12 h-12">
                    <path
                        d="M 30 5 L 37 22 L 55 22 L 40 34 L 47 52 L 30 42 L 13 52 L 20 34 L 5 22 L 23 22 Z"
                        fill="#F7B23B"
                    />
                </svg>
            ),
        },
        pretzel: {
            hasHole: true,
            element: (
                <svg viewBox="0 0 60 60" className="w-12 h-12">
                    <path
                        d="M 15 45 Q 5 30 20 20 Q 30 10 40 20 Q 55 30 45 45"
                        fill="none"
                        stroke="#C9A86C"
                        strokeWidth="8"
                        strokeLinecap="round"
                    />
                    <circle cx="22" cy="32" r="6" fill="white" />
                    <circle cx="38" cy="32" r="6" fill="white" />
                </svg>
            ),
        },
        cube: {
            hasHole: false,
            element: (
                <svg viewBox="0 0 60 60" className="w-12 h-12">
                    <rect x="12" y="12" width="36" height="36" rx="4" fill="#8E90F5" />
                    <rect x="18" y="18" width="12" height="12" rx="2" fill="rgba(255,255,255,0.3)" />
                </svg>
            ),
        },
        ring: {
            hasHole: true,
            element: (
                <svg viewBox="0 0 60 60" className="w-12 h-12">
                    <circle cx="30" cy="30" r="22" fill="#AC8BF9" />
                    <circle cx="30" cy="30" r="10" fill="white" />
                </svg>
            ),
        },
    };

    const handleDrop = (box: 'noHole' | 'oneHole', shape: string) => {
        const isCorrect = (box === 'noHole' && !shapes[shape].hasHole) ||
                          (box === 'oneHole' && shapes[shape].hasHole);

        if (isCorrect) {
            setSorted(prev => ({
                ...prev,
                [box]: [...prev[box], shape],
            }));
            setAvailable(prev => prev.filter(s => s !== shape));

            // Check if all sorted
            if (available.length === 1) {
                setVar('sortingTaskStatus', 'correct');
            }
        }
    };

    const allSorted = available.length === 0;

    return (
        <div className="p-4">
            {/* Available shapes */}
            {!allSorted && (
                <div className="mb-6">
                    <div className="text-center text-slate-600 mb-3 font-medium">
                        Tap a shape, then tap the right box!
                    </div>
                    <div className="flex justify-center gap-4 flex-wrap">
                        {available.map(shape => (
                            <button
                                key={shape}
                                className="p-3 bg-white rounded-xl shadow-md hover:shadow-lg hover:scale-110 transition-all border-2 border-transparent hover:border-amber-300"
                                onClick={() => {
                                    // Simple click-to-sort: cycle through and place
                                    const shapeData = shapes[shape];
                                    handleDrop(shapeData.hasHole ? 'oneHole' : 'noHole', shape);
                                }}
                            >
                                {shapes[shape].element}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Sorting boxes */}
            <div className="grid grid-cols-2 gap-4">
                {/* No Hole Box */}
                <div
                    className={`p-4 rounded-2xl border-4 border-dashed min-h-[120px] transition-colors ${
                        allSorted ? 'bg-teal-100 border-teal-400' : 'bg-teal-50 border-teal-300'
                    }`}
                >
                    <div className="text-center text-teal-700 font-bold mb-2">No Holes</div>
                    <div className="flex justify-center gap-2 flex-wrap">
                        {sorted.noHole.map(shape => (
                            <div key={shape} className="p-2 bg-white rounded-lg shadow">
                                {shapes[shape].element}
                            </div>
                        ))}
                    </div>
                </div>

                {/* One Hole Box */}
                <div
                    className={`p-4 rounded-2xl border-4 border-dashed min-h-[120px] transition-colors ${
                        allSorted ? 'bg-rose-100 border-rose-400' : 'bg-rose-50 border-rose-300'
                    }`}
                >
                    <div className="text-center text-rose-700 font-bold mb-2">Has a Hole</div>
                    <div className="flex justify-center gap-2 flex-wrap">
                        {sorted.oneHole.map(shape => (
                            <div key={shape} className="p-2 bg-white rounded-lg shadow">
                                {shapes[shape].element}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Success message */}
            {allSorted && (
                <div className="mt-4 text-center">
                    <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold">
                        <span>🎉</span> You sorted them all!
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// FEEDBACK COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function BallToSnakeFeedback() {
    const answer = useVar('answerBallToSnake', '') as string;
    if (!answer) return null;

    const isCorrect = answer.toLowerCase() === 'yes';
    if (isCorrect) {
        return <span className="text-green-600 font-medium"> That is right! We can stretch a ball into a long snake shape.</span>;
    }
    return <span className="text-amber-600"> Actually, we can! Try stretching the play-dough above to see.</span>;
}

function BallToDonutFeedback() {
    const answer = useVar('answerBallToDonut', '') as string;
    if (!answer) return null;

    const isCorrect = answer.toLowerCase() === 'no';
    if (isCorrect) {
        return <span className="text-green-600 font-medium"> Exactly! A donut has a hole, and we cannot make a hole just by stretching.</span>;
    }
    return <span className="text-amber-600"> Think about it: a donut has a hole in the middle. Can you make a hole without poking?</span>;
}

// ═══════════════════════════════════════════════════════════════════════════
// LESSON BLOCKS
// ═══════════════════════════════════════════════════════════════════════════

export const topologyLessonBlocks: ReactElement[] = [
    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 1: INTRODUCTION
    // ═══════════════════════════════════════════════════════════════════════
    <StackLayout key="layout-intro-title" maxWidth="xl">
        <Block id="intro-title" padding="lg">
            <EditableH1 id="h1-intro-title" blockId="intro-title">
                Stretching and Squishing
            </EditableH1>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-intro-subtitle" maxWidth="xl">
        <Block id="intro-subtitle" padding="sm">
            <EditableParagraph id="para-intro-subtitle" blockId="intro-subtitle">
                <span className="text-2xl">🎨 A Play-Dough Adventure!</span>
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-intro-hook" maxWidth="xl">
        <Block id="intro-hook" padding="md">
            <EditableParagraph id="para-intro-hook" blockId="intro-hook">
                Did you know that a ball and a snake are secretly the same shape? And a donut and a coffee cup are best friends forever? Let us discover the magical world of squishy shapes!
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <SplitLayout key="layout-intro-playdough" ratio="1:1" gap="lg">
        <Block id="intro-playdough-text" padding="md">
            <EditableParagraph id="para-intro-playdough" blockId="intro-playdough-text">
                Here is your very own play-dough! You can stretch it and squish it into any shape you want. Try dragging the{" "}
                <InlineTooltip id="tooltip-green-dots" tooltip="These are the stretchy handles! Drag them around to change the shape.">
                    green dots
                </InlineTooltip>
                {" "}to make it tall, wide, or wiggly. Watch how the face changes when you stretch it!
            </EditableParagraph>
        </Block>
        <Block id="intro-playdough-visual" padding="sm" hasVisualization>
            <PlayDoughShape />
        </Block>
    </SplitLayout>,

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 2: THE MAGIC RULE
    // ═══════════════════════════════════════════════════════════════════════
    <StackLayout key="layout-rule-heading" maxWidth="xl">
        <Block id="rule-heading" padding="lg">
            <EditableH2 id="h2-rule-heading" blockId="rule-heading">
                The Magic Rule
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-rule-explanation" maxWidth="xl">
        <Block id="rule-explanation" padding="md">
            <EditableParagraph id="para-rule-explanation" blockId="rule-explanation">
                When playing with play-dough, we have one special rule: We can{" "}
                <InlineTooltip id="tooltip-stretch" tooltip="Pull it to make it longer!">
                    stretch
                </InlineTooltip>
                , we can{" "}
                <InlineTooltip id="tooltip-squish" tooltip="Push it to make it flatter!">
                    squish
                </InlineTooltip>
                , and we can{" "}
                <InlineTooltip id="tooltip-bend" tooltip="Curve it like a rainbow!">
                    bend
                </InlineTooltip>
                . But we must never, ever poke a hole or tear it apart!
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <GridLayout key="layout-rule-icons" columns={3} gap="lg">
        <Block id="rule-icon-stretch" padding="md">
            <div className="text-center p-4 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl">
                <div className="text-4xl mb-2">↔️</div>
                <div className="text-teal-700 font-bold">Stretch</div>
                <div className="text-teal-600 text-sm">Yes!</div>
            </div>
        </Block>
        <Block id="rule-icon-squish" padding="md">
            <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl">
                <div className="text-4xl mb-2">↕️</div>
                <div className="text-indigo-700 font-bold">Squish</div>
                <div className="text-indigo-600 text-sm">Yes!</div>
            </div>
        </Block>
        <Block id="rule-icon-poke" padding="md">
            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl">
                <div className="text-4xl mb-2">🕳️</div>
                <div className="text-red-700 font-bold">Poke Holes</div>
                <div className="text-red-600 text-sm">No!</div>
            </div>
        </Block>
    </GridLayout>,

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 3: SHAPE TRANSFORMATIONS
    // ═══════════════════════════════════════════════════════════════════════
    <StackLayout key="layout-transform-heading" maxWidth="xl">
        <Block id="transform-heading" padding="lg">
            <EditableH2 id="h2-transform-heading" blockId="transform-heading">
                Shape Friends
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-transform-explanation" maxWidth="xl">
        <Block id="transform-explanation" padding="md">
            <EditableParagraph id="para-transform-explanation" blockId="transform-explanation">
                Some shapes are secretly the same! A ball can become a snake if we stretch it. A ball can become a pancake if we squish it. These shapes are all in the same family because we can turn one into another without poking holes.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-transform-grid" maxWidth="2xl">
        <Block id="transform-grid" padding="md" hasVisualization>
            <ShapeComparisonGrid />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-transform-question" maxWidth="xl">
        <Block id="transform-question" padding="md">
            <EditableParagraph id="para-transform-question" blockId="transform-question">
                Can a ball become a snake by stretching?{" "}
                <InlineFeedback
                    varName="answerBallToSnake"
                    correctValue="yes"
                    position="standalone"
                    successMessage="That is right! We can stretch a ball into a long snake shape"
                    failureMessage="Try again!"
                    hint="Think about stretching play-dough longer and longer"
                >
                    <InlineClozeInput
                        varName="answerBallToSnake"
                        correctAnswer="yes"
                        {...clozePropsFromDefinition(getVariableInfo('answerBallToSnake'))}
                    />
                </InlineFeedback>
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 4: THE IMPOSSIBLE CHALLENGE
    // ═══════════════════════════════════════════════════════════════════════
    <StackLayout key="layout-impossible-heading" maxWidth="xl">
        <Block id="impossible-heading" padding="lg">
            <EditableH2 id="h2-impossible-heading" blockId="impossible-heading">
                The Impossible Challenge
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-impossible-explanation" maxWidth="xl">
        <Block id="impossible-explanation" padding="md">
            <EditableParagraph id="para-impossible-explanation" blockId="impossible-explanation">
                Now here is a tricky puzzle. Can we turn a ball into a donut? A donut has a hole in the middle. But our magic rule says we cannot poke holes! So a ball and a donut are NOT in the same family.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-impossible-visual" maxWidth="xl">
        <Block id="impossible-visual" padding="md" hasVisualization>
            <ImpossibleTransformation />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-impossible-question" maxWidth="xl">
        <Block id="impossible-question" padding="md">
            <EditableParagraph id="para-impossible-question" blockId="impossible-question">
                Can a ball become a donut without poking a hole?{" "}
                <InlineFeedback
                    varName="answerBallToDonut"
                    correctValue="no"
                    position="standalone"
                    successMessage="Exactly! A donut has a hole, and we cannot make a hole just by stretching"
                    failureMessage="Think about it again!"
                    hint="A donut has a hole in the middle. Can you make a hole without poking?"
                >
                    <InlineClozeInput
                        varName="answerBallToDonut"
                        correctAnswer="no"
                        {...clozePropsFromDefinition(getVariableInfo('answerBallToDonut'))}
                    />
                </InlineFeedback>
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-why-question" maxWidth="xl">
        <Block id="why-question" padding="md">
            <EditableParagraph id="para-why-question" blockId="why-question">
                Why is a donut different from a ball? Because the donut has a{" "}
                <InlineFeedback
                    varName="answerWhyNotDonut"
                    correctValue="hole"
                    position="mid"
                    successMessage="✓"
                    failureMessage="✗"
                    hint="What is in the middle of a donut?"
                >
                    <InlineClozeChoice
                        varName="answerWhyNotDonut"
                        correctAnswer="hole"
                        options={["hole", "color", "size"]}
                        {...choicePropsFromDefinition(getVariableInfo('answerWhyNotDonut'))}
                    />
                </InlineFeedback>{" "}
                in the middle!
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 5: SORTING GAME
    // ═══════════════════════════════════════════════════════════════════════
    <StackLayout key="layout-sorting-heading" maxWidth="xl">
        <Block id="sorting-heading" padding="lg">
            <EditableH2 id="h2-sorting-heading" blockId="sorting-heading">
                Sorting Game
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sorting-explanation" maxWidth="xl">
        <Block id="sorting-explanation" padding="md">
            <EditableParagraph id="para-sorting-explanation" blockId="sorting-explanation">
                Now it is your turn to be a shape detective! Look at each shape and decide: does it have a hole, or no hole? Tap each shape to sort it into the right box.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sorting-game" maxWidth="2xl">
        <Block id="sorting-game" padding="md" hasVisualization>
            <SortingGame />
        </Block>
    </StackLayout>,

    // Final celebration
    <StackLayout key="layout-celebration" maxWidth="xl">
        <Block id="celebration" padding="lg">
            <EditableParagraph id="para-celebration" blockId="celebration">
                <span className="text-xl">🌟 You are now a Shape Explorer! 🌟</span>
                <br /><br />
                You learned that some shapes can stretch and squish into each other, but shapes with different numbers of holes can never become each other. Next time you play with play-dough, remember the magic rule!
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
