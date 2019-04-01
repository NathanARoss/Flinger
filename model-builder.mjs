export function initCircle(gl, iterations, red, green, blue) {
    if (typeof iterations !== "number" || iterations < 1)
        iterations = 1;

    let count = 3; //first iteration requires 3 vertexes

    //each successive iteration requires twice as many vertexes as the previous iteration
    let vertexesNeededThisIteration = 9;
    for (let i = 1; i < iterations; ++i) {
        count += vertexesNeededThisIteration;
        vertexesNeededThisIteration *= 2;
    }

    const model = new Int8Array(count * 8);
    let i = 0;
    const radius = 127;

    const r = (red * 255) | 0;
    const g = (green * 255) | 0;
    const b = (blue * 255) | 0;

    //first iteration
    for (let vertex = 0; vertex < 3; ++vertex) {
        let theta = Math.PI * 2 / 3 * vertex;
        model[i++] = Math.cos(theta) * radius;
        model[i++] = Math.sin(theta) * radius;
        model[i++] = 0;
        model[i++] = 0;
        model[i++] = r;
        model[i++] = g;
        model[i++] = b;
        model[i++] = 0;
    }

    //further iterations subdivide the exposed sides into more polygons
    let polygons = 3;
    for (let iteration = 2; iteration <= iterations; ++iteration) {
        for (let p = 0; p < polygons; ++p) {
            for (let vertex = 0; vertex < 3; ++vertex) {
                let theta = Math.PI * (p * 2 + vertex) / polygons;
                model[i++] = Math.cos(theta) * radius;
                model[i++] = Math.sin(theta) * radius;
                model[i++] = 0;
                model[i++] = 0;
                model[i++] = r;
                model[i++] = g;
                model[i++] = b;
                model[i++] = 0;
            }
        }

        polygons *= 2;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, model, gl.STATIC_DRAW);

    return {
        buffer,
        vertexCount: model.length / 8,
        mode: gl.TRIANGLES
    };
}

export function initBox(gl, red, green, blue) {
    const model = new Int8Array(4 * 8);
    let i = 0;

    const r = (red * 255) | 0;
    const g = (green * 255) | 0;
    const b = (blue * 255) | 0;

    model[i++] = +127;
    model[i++] = +127;
    model[i++] = 0;
    model[i++] = 0;
    model[i++] = r;
    model[i++] = g;
    model[i++] = b;
    model[i++] = 0;

    model[i++] = -127;
    model[i++] = +127;
    model[i++] = 0;
    model[i++] = 0;
    model[i++] = r;
    model[i++] = g;
    model[i++] = b;
    model[i++] = 0;

    model[i++] = +127;
    model[i++] = -127;
    model[i++] = 0;
    model[i++] = 0;
    model[i++] = r;
    model[i++] = g;
    model[i++] = b;
    model[i++] = 0;

    model[i++] = -127;
    model[i++] = -127;
    model[i++] = 0;
    model[i++] = 0;
    model[i++] = r;
    model[i++] = g;
    model[i++] = b;
    model[i++] = 0;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, model, gl.STATIC_DRAW);

    return {
        buffer,
        vertexCount: model.length / 8,
        mode: gl.TRIANGLE_STRIP
    };
}

export function initTexturedBox(gl, u1, v1, u2, v2) {
    const model = new Int8Array(4 * 4);
    let i = 0;

    model[i++] = +127;
    model[i++] = +127;
    model[i++] = u2;
    model[i++] = v1;

    model[i++] = -127;
    model[i++] = +127;
    model[i++] = u1;
    model[i++] = v1;

    model[i++] = +127;
    model[i++] = -127;
    model[i++] = u2;
    model[i++] = v2;

    model[i++] = -127;
    model[i++] = -127;
    model[i++] = u1;
    model[i++] = v2;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, model, gl.STATIC_DRAW);

    return {
        buffer,
        vertexCount: model.length / 4,
        mode: gl.TRIANGLE_STRIP
    };
}

export function initPolygon(gl, verticies, red, green, blue) {
    const vertexCount = verticies.length / 2;
    const polygonCount = vertexCount - 2;
    const model = new Int8Array(polygonCount * 3 * 8);
    let i = 0;

    const r = (red * 255) | 0;
    const g = (green * 255) | 0;
    const b = (blue * 255) | 0;

    let fail = 100;
    while (verticies.length > 4 && --fail >= 0) {
        for (let j = 0; j < verticies.length; j += 2) {
            const clockwise = ((verticies[j + 3] - verticies[j + 1]) * (verticies[j + 4] - verticies[j + 2]) -
                (verticies[j + 2] - verticies[j + 0]) * (verticies[j + 5] - verticies[j + 3])) > 0;

            if (clockwise) {
                model[i++] = verticies[j];
                model[i++] = verticies[j + 1];
                model[i++] = 0;
                model[i++] = 0;
                model[i++] = r;
                model[i++] = g;
                model[i++] = b;
                model[i++] = 0;

                model[i++] = verticies[j + 2];
                model[i++] = verticies[j + 3];
                model[i++] = 0;
                model[i++] = 0;
                model[i++] = r;
                model[i++] = g;
                model[i++] = b;
                model[i++] = 0;

                model[i++] = verticies[j + 4];
                model[i++] = verticies[j + 5];
                model[i++] = 0;
                model[i++] = 0;
                model[i++] = r;
                model[i++] = g;
                model[i++] = b;
                model[i++] = 0;

                verticies.splice(i + 2, 2);
                break;
            }
        }
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, model, gl.STATIC_DRAW);

    return {
        buffer,
        vertexCount: model.length / 8,
        mode: gl.TRIANGLES
    };
}