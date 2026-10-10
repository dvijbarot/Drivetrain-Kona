"""Editable, original educational assets. Blender 4.3+, no external model dependencies.

Coordinates in the recipes are x = transverse, y = height, z = rearward.
Vehicle dimensions are referenced to Hyundai's SX2 product guide. Surfaces,
casting geometry and suspension hardpoints are representative, not OEM CAD.
Run: blender -b --python scripts/build_models.py
"""
import bpy, math, os, json
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'models')
os.makedirs(OUT, exist_ok=True)
TAU = 2 * math.pi
def V(p): return Vector((p[0], -p[2], p[1]))

def material(name, color, metallic=0, rough=.4):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    if name == 'Pearl titanium paint':
        b.inputs['Coat Weight'].default_value = 1
        b.inputs['Coat Roughness'].default_value = .16
    return m

M = {
 'paint':material('Pearl titanium paint',(.095,.16,.19),.7,.27),
 'cast':material('Cast aluminium',(.49,.51,.52),.85,.48),
 'machined':material('Machined aluminium',(.67,.69,.71),.98,.24),
 'steel':material('Forged steel',(.32,.34,.36),.96,.32),
 'black':material('Satin polymer',(.025,.028,.033),.04,.54),
 'rubber':material('Tire rubber',(.025,.027,.029),0,.82),
 'tread':material('Tread rubber',(.035,.038,.041),0,.86),
 'glass':material('Tinted laminated glass',(.045,.082,.105),.28,.13),
 'chrome':material('Satin chrome',(.59,.62,.65),1,.25),
 'disc':material('Brake rotor iron',(.4,.42,.43),.95,.38),
 'friction':material('Friction lining',(.105,.084,.06),.05,.84),
 'white':material('LED diffuser',(.78,.86,.89),.2,.18),
 'red':material('Red lamp lens',(.4,.012,.022),.3,.2),
 'copper':material('Copper winding',(.43,.17,.057),1,.35),
 'interior':material('Charcoal leatherette',(.039,.04,.043),0,.75),
 'gasket':material('Elastomer gasket',(.057,.06,.055),0,.85)
}

def reset():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

def mesh(name, verts, faces, mat='cast', smooth=True):
    d=bpy.data.meshes.new(name); d.from_pydata([V(v) for v in verts],[],faces);d.update()
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);d.materials.append(M[mat])
    for p in d.polygons:p.use_smooth=smooth
    return o

def finish(o, mat='cast', bevel=0):
    o.data.materials.append(M[mat])
    if bevel:
        b=o.modifiers.new('Manufacturing edge radii','BEVEL');b.width=bevel;b.segments=3
        b.limit_method='ANGLE'
        bpy.context.view_layer.objects.active=o
        bpy.ops.object.modifier_apply(modifier=b.name)
        n=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');n.keep_sharp=True;n.weight=50
        bpy.ops.object.modifier_apply(modifier=n.name)
    for p in o.data.polygons:p.use_smooth=True
    return o

def box(name, pos, size, mat='cast', bevel=.008):
    bpy.ops.mesh.primitive_cube_add(size=1,location=V(pos));o=bpy.context.object;o.name=name
    o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,mat,bevel)

def cyl(name, pos, radius, length, mat='machined', axis='x', vertices=48, bevel=.003):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=length,location=V(pos))
    o=bpy.context.object;o.name=name
    direction=V({'x':(1,0,0),'y':(0,1,0),'z':(0,0,1)}[axis])
    o.rotation_euler=Vector((0,0,1)).rotation_difference(direction).to_euler()
    return finish(o,mat,bevel)

def rod(name,a,b,r,mat='steel',vertices=20):
    a,b=V(a),V(b);d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=d.length,location=(a+b)/2)
    o=bpy.context.object;o.name=name;o.rotation_euler=Vector((0,0,1)).rotation_difference(d).to_euler()
    return finish(o,mat,.002)

def tube(name, points, radius, mat='steel', cyclic=False, resolution=3):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=radius;c.bevel_resolution=resolution
    s=c.splines.new('POLY');s.points.add(len(points)-1)
    for p,co in zip(s.points,points):p.co=(*V(co),1)
    s.use_cyclic_u=cyclic
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);c.materials.append(M[mat])
    bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
    return o

def ring(name,x,r,width,mat='machined',segments=96,inner=None):
    inner=inner if inner is not None else r-.018
    return lathe(name,[(x-width/2,inner),(x-width/2,r),(x+width/2,r),(x+width/2,inner)],mat,segments,close=True)

def lathe(name, profile, mat='machined', segments=96, close=False):
    verts=[];faces=[]
    for x,r in profile:
        for j in range(segments):
            a=j/segments*TAU;verts.append((x,r*math.cos(a),r*math.sin(a)))
    n=len(profile)
    for k in range(n if close else n-1):
        for j in range(segments):
            a=k*segments+j;b=k*segments+(j+1)%segments
            c=((k+1)%n)*segments+(j+1)%segments;d=((k+1)%n)*segments+j
            faces.append((a,b,c,d))
    return mesh(name,verts,faces,mat)

def boolean(target, cutter, operation='DIFFERENCE'):
    bpy.context.view_layer.objects.active=target
    b=target.modifiers.new('Casting / machined cavity','BOOLEAN');b.operation=operation;b.solver='EXACT';b.object=cutter
    bpy.ops.object.modifier_apply(modifier=b.name);bpy.data.objects.remove(cutter,do_unlink=True)

def bolt(name, pos, r=.012, axis='y'):
    cyl(name,pos,r,r*.7,'steel',axis,6,.001)
    cyl(name+' washer',pos,r*1.3,r*.14,'machined',axis,20,.0003)

def join_prefixes():
    # Assembly names before :: remain addressable; consolidate all details per material.
    groups=defaultdict(list)
    for o in list(bpy.context.scene.objects):
        if o.type=='MESH':groups[o.name.split('::')[0]].append(o)
    for name,obs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in obs:o.select_set(True)
        bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
        # All source coordinates become local asset coordinates.
        bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

def export(filename):
    join_prefixes()
    # Bake contact occlusion into vertex colors, so the low graphics mode also
    # retains depth around cast ribs, fasteners, spokes and structural joints.
    # These colors are an artistic lighting approximation, never thermal data.
    verts=[];faces=[]
    for o in bpy.context.scene.objects:
        if o.type!='MESH':continue
        offset=len(verts);verts.extend([o.matrix_world@v.co for v in o.data.vertices])
        faces.extend([tuple(offset+i for i in f.vertices) for f in o.data.polygons])
    tree=BVHTree.FromPolygons(verts,faces,all_triangles=False,epsilon=.00001)
    radius=.12 if filename in ['kona-sx2-body','kona-sx2-chassis'] else .045 if filename=='wheel-18' else .22
    directions=[]
    for i in range(10):
        z=.15+.8*(i+.5)/10;a=i*2.39996323;r=math.sqrt(1-z*z)
        directions.append(Vector((r*math.cos(a),r*math.sin(a),z)))
    for o in bpy.context.scene.objects:
        if o.type!='MESH':continue
        d=o.data;colors=d.color_attributes.new(name='Contact occlusion',type='FLOAT_COLOR',domain='POINT')
        for v in d.vertices:
            p=o.matrix_world@v.co;normal=(o.matrix_world.to_3x3()@v.normal).normalized()
            rotation=Vector((0,0,1)).rotation_difference(normal)
            origin=p+normal*.0015;hits=0
            for direction in directions:
                hit,_,_,distance=tree.ray_cast(origin,rotation@direction,radius)
                if hit is not None:hits+=1-(distance/radius)*.35
            shade=1-.58*hits/len(directions)
            colors.data[v.index].color=(shade,shade,shade,1)
    for o in bpy.context.scene.objects:
        if o.type!='MESH':continue
        # Box projection for micro-surface normals; repeated at material scale.
        uv=o.data.uv_layers.active or o.data.uv_layers.new(name='Surface coordinates')
        for face in o.data.polygons:
            axis=max(range(3),key=lambda k:abs(face.normal[k]))
            axes=[k for k in range(3) if k!=axis]
            for loop_id in face.loop_indices:
                co=o.data.vertices[o.data.loops[loop_id].vertex_index].co
                uv.data[loop_id].uv=(co[axes[0]],co[axes[1]])
    path=os.path.join(OUT,filename+'.glb')
    bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',export_apply=True,export_yup=True,export_normals=True,export_texcoords=True,export_materials='EXPORT',export_vertex_color='ACTIVE',export_all_vertex_colors=False)
    tris=sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')
    print('ASSET',filename,os.path.getsize(path),tris)
    # A second real mesh LOD, selected on mobile / low graphics. Materials retained.
    for o in bpy.context.scene.objects:
        if o.type=='MESH' and len(o.data.polygons)>100:
            d=o.modifiers.new('Mobile mesh LOD','DECIMATE');d.ratio=.48 if filename!='kona-sx2-body' else .65
            bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=d.name)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,filename+'-low.glb'),export_format='GLB',export_apply=True,export_yup=True,export_normals=True,export_texcoords=True,export_materials='EXPORT',export_vertex_color='ACTIVE',export_all_vertex_colors=False)

def build_wheel():
    reset()
    # 18-inch rim. 215/55 R18 reference sidewall profile; exact tire SKU and tread are not asserted.
    lathe('wheel::sidewall',[(-.117,.223),(-.126,.24),(-.127,.269),(-.12,.303),(-.106,.327),(-.09,.333),(.09,.333),(.106,.327),(.12,.303),(.127,.269),(.126,.24),(.117,.223)],'rubber',160)
    # Circumferential ribs and separate tread blocks form actual drainage grooves.
    for j in range(100):
        a=j/100*TAU
        for k,(x,w) in enumerate([(-.079,.043),(-.026,.041),(.026,.041),(.079,.043)]):
            p=[];fs=[];start=a+(.010 if k%2 else 0)
            for xx in [x-w/2,x+w/2]:
                for rad in [.330,.336]:
                    for q in range(5):
                        t=start+(q/4*.047)+(.014*xx/.12)
                        p.append((xx,rad*math.cos(t),rad*math.sin(t)))
            for q in range(4):
                fs.extend([(q,q+1,q+6,q+5),(q+10,q+15,q+16,q+11),(q+5,q+6,q+16,q+15),(q,q+10,q+11,q+1)])
            fs.extend([(0,5,15,10),(4,14,19,9)])
            mesh('wheel::tread block',p,fs,'tread')
    # Rim barrel: drop center, flanges and rolled edges.
    lathe('wheel::barrel',[(-.111,.227),(-.115,.232),(-.109,.237),(-.103,.237),(-.098,.225),(-.066,.22),(-.046,.21),(.044,.21),(.068,.22),(.102,.225),(.11,.227),(.114,.234),(.107,.238),(.10,.235)],'chrome',128)
    ring('wheel::outer lip',.111,.233,.010,'machined',128,inner=.224)
    ring('wheel::inner lip',-.108,.233,.008,'machined',128,inner=.224)
    cyl('wheel::hub',(.102,0,0),.071,.025,'black')
    # Angular split aero spokes: satin black pockets, thin diamond-cut faces.
    shape=[(.045,-.025),(.122,-.04),(.212,-.038),(.225,-.014),(.132,.008),(.075,.012)]
    for j in range(5):
        a=j/5*TAU+.16
        for sign in [-1,1]:
            verts=[]
            for xx in [.072,.104]:
                for rr,tan in shape:
                    tan=tan*sign;verts.append((xx,rr*math.cos(a)-tan*math.sin(a),rr*math.sin(a)+tan*math.cos(a)))
            n=len(shape);faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(q,(q+1)%n,(q+1)%n+n,q+n) for q in range(n)]
            o=mesh('wheel::spoke black pocket',verts,faces,'black',False)
            b=o.modifiers.new('Spoke edge radius','BEVEL');b.width=.002;b.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=b.name)
            # Face inlay follows spoke surfaces with a restrained bright edge.
            pts=[]
            for rr,tan in [( .063,-.011),(.13,-.025),(.211,-.025),(.216,-.016),(.13,-.007),(.076,.003)]:
                tan*=sign;pts.append((.105,rr*math.cos(a)-tan*math.sin(a),rr*math.sin(a)+tan*math.cos(a)))
            mesh('wheel::diamond cut face',pts,[tuple(range(6))],'machined',False)
        r=.052
        bolt('wheel::lug nut',(.121,r*math.cos(a),r*math.sin(a)),.011,'x')
    cyl('wheel::center cap',(.12,0,0),.037,.007,'chrome')
    cyl('wheel::center badge',(.125,0,0),.031,.004,'black')
    # Valve stem, molded sidewall lines, and small rim balancing mass.
    rod('wheel::valve',(.09,.17,.095),(.13,.18,.10),.005,'black')
    ring('wheel::sidewall bead',.127,.248,.002,'rubber',128,inner=.245)
    ring('wheel::sidewall shoulder',.118,.308,.002,'tread',128,inner=.306)
    for j in range(72):
        a=j/72*TAU;rod('wheel::sidewall rib',(.126,.268*math.cos(a),.268*math.sin(a)),(.124,.29*math.cos(a+.008),.29*math.sin(a+.008)),.0006,'tread',8)
    # Disc is a separate spinning assembly; caliper never follows wheel rotation.
    for x in [-.021,-.002]:ring('rotor::friction face',x,.152,.009,'disc',128,inner=.077)
    lathe('rotor::hat',[(-.025,.075),(-.018,.075),(.014,.066),(.014,.036),(.004,.036),(.004,.062),(-.025,.062)],'steel',96,True)
    for j in range(52):
        a=j/52*TAU
        rod('rotor::vent vane',(-.012,.081*math.cos(a),.081*math.sin(a)),(-.012,.146*math.cos(a+.09),.146*math.sin(a+.09)),.003,'disc',8)
    box('caliper::casting',(-.012,.128,-.065),(.075,.078,.124),'cast',.017)
    for x in [-.05,.028]:box('caliper::pad',(x,.134,-.065),(.012,.06,.09),'friction',.003)
    for z in [-.12,-.02]:bolt('caliper::slide bolt',(.035,.13,z),.010,'x')
    # 215/55 R18 nominal unloaded radius: 0.2286 + 0.215*0.55 = 0.34685 m.
    # Tread is original representative geometry, not a manufacturer pattern.
    for o in list(bpy.context.scene.objects):
        if o.type=='MESH' and o.name.startswith('wheel::') and any(k in o.name for k in ['sidewall','tread']):
            bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);o.select_set(False)
            for v in o.data.vertices:
                co=o.matrix_world@v.co;rad=math.hypot(co.y,co.z)
                if rad>.223:
                    new=.223+(rad-.223)*(.34685-.223)/(.336-.223)
                    if rad>0:co.y*=new/rad;co.z*=new/rad
                    co.x*=.215/.235;v.co=o.matrix_world.inverted()@co
    export('wheel-18')

def build_engine():
    reset()
    block=box('block::cast block',(0,.49,0),(1.98,1.18,.93),'cast',.07)
    for x in [-.675,-.225,.225,.675]:
        cut=cyl('cut',(x,.69,0),.218,1.26,'cast','y',64,0);boolean(block,cut)
    # Main bearing tunnel and crankcase cavity.
    boolean(block,cyl('cut',(0,0,0),.27,2.2,'cast','x',48,0))
    # Correctly modeled bore liners, deck gasket holes and bolt bosses.
    for x in [-.675,-.225,.225,.675]:
        # vertical lathe ring at bore; coordinates rotate from x axis to y axis
        o=ring('block::cylinder liner',0,.217,.86,'steel',64,inner=.208)
        o.rotation_euler[1]=0;o.rotation_euler[0]=math.pi/2 # Blender x axis to vertical requires about Y
        o.rotation_euler=(0,-math.pi/2,0);o.location=V((x,.63,0))
        for z in [-.37,.37]:
            cyl('block::deck bolt boss',(x,1.073,z),.047,.026,'machined','y',24)
            bolt('block::head bolt',(x,1.087,z),.024,'y')
    for side in [-1,1]:
        for x in [-.85,-.45,0,.45,.85]:
            box('block::casting rib',(x,.35,side*.479),(.049,.80,.035),'cast',.015)
        for x in [-.6,0,.6]:
            cyl('block::core plug',(x,.61,side*.487),.09,.020,'steel','z',40)
        for x in [-.82,.82]:
            cyl('block::mount boss',(x,.4,side*.51),.072,.12,'cast','z',32)
            bolt('block::mount bolt',(x,.4,side*.576),.029,'z')
    # Longitudinal stiffening and oil galleries are separate cast features.
    for y in [.02,.17,.91]:box('block::horizontal web',(0,y,-.48),(1.84,.042,.04),'cast',.01)
    # Split shells give cutaway mode a physically cut side instead of a transparent box.
    originals=[o for o in list(bpy.context.scene.objects) if o.name.startswith('block::')]
    for o in originals:
        clone=o.copy();clone.data=o.data.copy();bpy.context.collection.objects.link(clone);clone.name=o.name.replace('block::','block_cut::')
        if o is block:
            boolean(clone,box('cut',(0,.55,-.45),(2.2,1.5,.89),'cast',0))
    head=box('head::cylinder head',(0,1.24,0),(2.02,.32,1.05),'cast',.04)
    # Visible intake/exhaust port mouths, coil bosses and head casting texture geometry.
    for x in [-.675,-.225,.225,.675]:
        for z in [-.54,.54]:
            cyl('head::port flange',(x,1.22,z),.13,.042,'cast','z')
            cyl('head::port opening',(x,1.22,z*1.04),.092,.045,'black','z')
        cyl('head::spark plug well',(x,1.41,0),.055,.045,'machined','y')
    for x in [-.93,.93]:
        for z in [-.43,.43]:bolt('head::fastener',(x,1.39,z),.023)
    # Rocker cover sculpted rails and four ignition coils.
    cover=box('cover::rocker cover',(0,1.55,0),(1.98,.23,1.02),'black',.075)
    for z in [-.33,.33]:box('cover::cam cover bulge',(0,1.66,z),(1.83,.12,.25),'black',.055)
    for x in [-.675,-.225,.225,.675]:
        box('cover::ignition coil',(x,1.72,0),(.24,.095,.19),'black',.025)
        bolt('cover::coil bolt',(x+.09,1.775,0),.013)
        tube('cover::coil harness',[(x,1.75,-.11),(x,1.77,-.23),(-.92,1.77,-.23)],.018,'black')
    cyl('cover::oil filler',(.7,1.78,.3),.092,.05,'black','y')
    for x in [-.87,-.4,.3,.87]:
        for z in [-.45,.45]:bolt('cover::perimeter bolt',(x,1.68,z),.019)
    # Oil pan with formed ribs, gasket seam, drain and perimeter bolts.
    box('pan::oil pan',(0,-.29,0),(1.77,.37,.91),'cast',.10)
    box('pan::gasket flange',(0,-.12,0),(1.96,.045,.98),'machined',.035)
    for x in [-.7,-.35,0,.35,.7]:box('pan::rib',(x,-.4,0),(.055,.10,.75),'cast',.023)
    for x in [-.82,-.4,0,.4,.82]:
        for z in [-.44,.44]:bolt('pan::pan bolt',(x,-.145,z),.019)
    bolt('pan::drain plug',(.62,-.42,-.42),.032,'z')
    # Timing-chain cover with raised ribs and machined mounting perimeter.
    outline=[(-.14,-.31),(-.07,-.47),(.30,-.52),(.85,-.41),(1.26,-.45),(1.40,-.30),(1.42,.20),(1.31,.43),(.96,.45),(.77,.34),(.45,.35),(.18,.46),(-.07,.38)]
    verts=[(x,y,z) for x in [-1.10,-.95] for y,z in outline];n=len(outline)
    casing=mesh('timing::timing cover',verts,[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],'cast',False)
    b=casing.modifiers.new('Cast perimeter radius','BEVEL');b.width=.026;b.segments=3;bpy.context.view_layer.objects.active=casing;bpy.ops.object.modifier_apply(modifier=b.name)
    for z in [-.37,.37]:box('timing::web',(-1.12,.58,z),(.022,1.42,.046),'cast',.012)
    for y in [-.1,.35,.8,1.26]:
        for z in [-.42,.42]:bolt('timing::cover fastener',(-1.115,y,z),.022,'x')
    # Polymer intake runners and plenum. Exhaust lives on the opposite side.
    for x in [-.675,-.225,.225,.675]:
        pts=[(x,1.19,-.52),(x,1.24,-.66),(x,1.14,-.83),(x,.84,-.93),(x,.63,-.78)]
        tube('intake::intake runner',pts,.099,'black',resolution=4)
        for y in [1.11,1.03,.95]:box('intake::runner rib',(x,y,-.93),(.21,.019,.041),'black',.008)
        tube('exhaust::exhaust branch',[(x,1.19,.55),(x,1.19,.73),(x*.3,.70,.9),(0,.4,1.01)],.066,'steel',resolution=3)
    rod('intake::plenum',(-.88,.62,-.77),(.92,.62,-.77),.15,'black',48)
    cyl('intake::throttle body',(.99,.62,-.77),.16,.19,'cast')
    box('intake::throttle motor',(1.02,.78,-.77),(.22,.15,.22),'black',.032)
    box('exhaust::heat shield',(0,.95,.80),(1.78,.48,.09),'cast',.07)
    # Accessory alternator casting, vent slots, terminals, oil filter and starter.
    cyl('ancillary::alternator',(-.81,.17,-.69),.22,.39,'cast')
    for j in range(12):
        a=j/12*TAU
        rod('ancillary::alternator vent',(-1.02,.17+.18*math.cos(a),-.69+.18*math.sin(a)),(-.63,.17+.18*math.cos(a),-.69+.18*math.sin(a)),.012,'black',8)
    cyl('ancillary::oil filter',(.53,.04,-.57),.12,.3,'black','y')
    cyl('ancillary::starter',(.78,.08,.51),.13,.4,'cast')
    export('engine-castings')

def bezier(a,b,c,d,n=24):
    return [tuple((1-t)**3*a[k]+3*(1-t)**2*t*b[k]+3*(1-t)*t*t*c[k]+t**3*d[k] for k in range(3)) for t in [i/n for i in range(n+1)]]

def panel(name, rows, mat='paint', subdivisions=2, thickness=.008):
    # Rows are equal-length control point strips. Catmull-Clark maintains continuous highlights.
    verts=[p for row in rows for p in row];w=len(rows[0]);faces=[]
    for i in range(len(rows)-1):
        for j in range(w-1):faces.append((i*w+j,i*w+j+1,(i+1)*w+j+1,(i+1)*w+j))
    o=mesh(name,verts,faces,mat)
    if subdivisions:
        s=o.modifiers.new('Class-A surface interpolation','SUBSURF');s.levels=subdivisions;s.render_levels=subdivisions
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=s.name)
    if thickness:
        s=o.modifiers.new('Panel thickness','SOLIDIFY');s.thickness=thickness
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=s.name)
    return o

def build_body():
    reset()
    # SX2 proportions: 4350 length, 1825 width, 2660 wheelbase; y zero at road.
    # Hood: center crown, depressed inner crease, shoulders and front LED seam.
    rows=[]
    for z,y,w in [(-2.15,.992,.80),(-2.13,1.005,.85),(-2.02,1.040,.88),(-1.65,1.075,.88),(-1.23,1.085,.84),(-.92,1.075,.79),(-.90,1.073,.785)]:
        nose=max(0,1-(z+2.15)/.65)
        row=[]
        for f,dy in [(-1,-.048),(-.96,-.028),(-.86,-.022),(-.7,.003),(-.4,.020),(0,.026),(.4,.020),(.7,.003),(.86,-.022),(.96,-.028),(1,-.048)]:
            row.append((w*f,y+dy,z+nose*.11*abs(f)**4))
        rows.append(row)
    panel('hood::hood panel',rows,subdivisions=2)
    # Roof and windshield have proper cross-car curvature.
    roof=[]
    for z,y,w in [(-.38,1.49,.68),(-.36,1.51,.69),(-.08,1.559,.69),(.42,1.577,.69),(.95,1.57,.685),(1.39,1.52,.66),(1.42,1.50,.65)]:
        roof.append([(-w,y-.045,z),(-w*.82,y-.012,z),(0,y+.005,z),(w*.82,y-.012,z),(w,y-.045,z)])
    panel('roof::roof',roof)
    # Sunroof glass and thin perimeter seal (Trend equipment).
    panel('glass::sunroof',[[(-.46,1.589,-.08),(-.3,1.595,-.08),(0,1.598,-.08),(.3,1.595,-.08),(.46,1.589,-.08)],[(-.46,1.589,.03),(-.3,1.595,.03),(0,1.598,.03),(.3,1.595,.03),(.46,1.589,.03)],[(-.46,1.589,.52),(-.3,1.595,.52),(0,1.598,.52),(.3,1.595,.52),(.46,1.589,.52)],[(-.46,1.588,.62),(-.3,1.594,.62),(0,1.597,.62),(.3,1.594,.62),(.46,1.588,.62)]],subdivisions=1,mat='glass',thickness=.004)
    windshield=[]
    for t in [0,.03,.3,.7,.97,1]:
        z=-.88+t*.50;y=1.08+t*.42;w=.757-t*.09
        windshield.append([(-w,y-.03,z),(-w*.88,y-.006,z),(0,y+.03,z-.022),(w*.88,y-.006,z),(w,y-.03,z)])
    panel('glass::windshield',windshield,mat='glass',subdivisions=2,thickness=.004)
    rear=[]
    for t in [0,.03,.35,.7,.97,1]:
        z=1.43+t*.63;y=1.50-t*.41;w=.65+t*.10
        rear.append([(-w,y-.025,z),(-w*.85,y,z),(0,y+.02,z),(w*.85,y,z),(w,y-.025,z)])
    panel('glass::rear window',rear,mat='glass',thickness=.004)
    # Side surfaces with genuine wheel openings; lower contour follows the arches.
    for side in [-1,1]:
        zs=sorted(set([-2.14,-2.12,-2.0,-1.88,-1.83,-1.33,-.83,-.81,-.78,-.45,0,.40,.76,.81,.83,1.33,1.83,1.86,2.08,2.15]+[center+.46*math.cos(j/16*math.pi) for center in [-1.33,1.33] for j in range(17)]))
        rows=[]
        for z in zs:
            arch=max([.335+math.sqrt(max(0,.48**2-(z-center)**2)) if abs(z-center)<.48 else .335 for center in [-1.33,1.33]])
            lower=max(.26,arch if arch>.34 else .27)
            shoulder=1.025 if z<-.8 else 1.066 if z<1.6 else 1.04
            wid=.888 if abs(z)<1.85 else .848
            rows.append([(side*(wid-.01),shoulder,z),(side*(wid+.006),shoulder-.035,z),(side*(wid+.007),shoulder-.13,z),(side*(wid-.008),max(lower+.06,shoulder-.32),z),(side*(wid-.03),lower+.025,z),(side*(wid-.04),lower,z)])
        panel('body::side panels',rows,subdivisions=2)
        # Arch cladding follows armor-like seven-sided arches; molded thickness and edge trim.
        for center in [-1.33,1.33]:
            profile=[(-.48,.30),(-.50,.56),(-.43,.76),(-.24,.87),(.23,.87),(.43,.74),(.50,.55),(.48,.30)]
            rows=[]
            for dz,y in profile:
                dz2=dz*1.12; y2=y+.05 if y>.4 else y
                rows.append([(side*.894,y,center+dz),(side*.912,y+.004,center+dz),(side*.911,y2,center+dz2),(side*.886,y2+.008,center+dz2)])
            panel('trim::wheel arch cladding',rows,mat='black',subdivisions=1,thickness=.008)
        # Sill and door sculpting line changes. Surface crease uses a shallow, formed highlight.
        tube('trim::lower sill',[(side*.849,.27,-.79),(side*.879,.265,-.71),(side*.879,.27,.73),(side*.849,.28,.82)],.044,'black')
        for z in [-.79,.18,1.18]:
            tube('trim::door shut line',[(side*.886,1.06,z),(side*.889,.96,z-.01),(side*.882,.61,z-.045),(side*.85,.32,z-.07)],.0018,'black',resolution=1)
        # Distinct A, B and C pillars plus two separated glass panes and rear quarter light.
        for z0,z1,yt0,yt1 in [(-.83,.13,1.07,1.51),(.16,1.12,1.51,1.52),(1.15,1.63,1.52,1.30)]:
            rows=[]
            for t in [0,.035,.4,.7,.965,1]:
                z=z0+(z1-z0)*t
                top=1.10+(z+.83)/.48*.4 if z<-.35 else 1.515 if z<1.12 else 1.515-(z-1.12)*.45
                # A-pillar rearward rake; first pane starts at same belt height then rises.
                top=max(1.10,top);bottom=1.071;wtop=.686 if top>1.42 else .735
                rows.append([(side*.852,bottom,z),(side*.847,bottom+.025,z),(side*(wtop+.028),top-.035,z),(side*wtop,top,z)])
            panel('glass::side glazing',rows,mat='glass',subdivisions=1,thickness=.004)
        # Structural pillars trace exact window boundaries rather than generic boxes.
        tube('body::A pillar',[(side*.782,1.064,-.92),(side*.76,1.115,-.83),(side*.704,1.415,-.46),(side*.685,1.486,-.35)],.028,'paint')
        tube('trim::B pillar',[(side*.851,1.07,.145),(side*.69,1.50,.145)],.022,'black')
        tube('body::C pillar',[(side*.853,1.069,1.66),(side*.77,1.28,1.57),(side*.66,1.50,1.40)],.061,'paint')
        tube('trim::satin beltline',[(side*.859,1.066,-.86),(side*.866,1.067,-.6),(side*.864,1.068,.7),(side*.853,1.067,1.64)],.006,'chrome')
        for z in [-.08,.97]:
            box('body::door handle',(side*.894,1.024,z),(.024,.025,.15),'paint',.012)
            box('trim::handle recess',(side*.887,1.025,z),(.016,.037,.175),'black',.015)
        # Mirror arm, sculpted shell, reflective lens and integrated signal.
        rod('trim::mirror stalk',(side*.80,1.12,-.71),(side*.972,1.12,-.72),.018,'black')
        box('body::mirror',(side*.977,1.18,-.72),(.17,.105,.20),'paint',.047)
        box('glass::mirror lens',(side*.983,1.18,-.624),(.147,.075,.006),'chrome',.023)
        tube('light::mirror repeater',[(side*1.051,1.166,-.794),(side*1.069,1.166,-.725),(side*1.05,1.166,-.66)],.003,'white')
        # Roof rails and mounting feet.
        tube('trim::roof rail',[(side*.60,1.578,-.32),(side*.60,1.613,-.15),(side*.60,1.622,1.08),(side*.60,1.574,1.39)],.017,'chrome')
        for z in [-.20,.96,1.28]:box('trim::roof rail foot',(side*.60,1.585,z),(.048,.044,.085),'black',.018)
    # Front and rear fascias loft across width, with grille openings reserved below.
    for rear in [False,True]:
        z=2.15 if rear else -2.15;sgn=1 if rear else -1
        rows=[]
        for y,w,dz in [(.31,.79,-.02),(.34,.86,.008),(.43,.874,.006),(.67,.89,-.03),(.76,.885,-.004),(.83,.884,-.017),(.975,.855,-.010),(1.020,.82,-.018)]:
            rows.append([(-w,y,z+sgn*(dz-.15)),(-w*.94,y+.003,z+sgn*(dz-.07)),(-w*.76,y+.006,z+sgn*(dz+.013)),(0,y+.016,z+sgn*(dz+.032)),(w*.76,y+.006,z+sgn*(dz+.013)),(w*.94,y+.003,z+sgn*(dz-.07)),(w,y,z+sgn*(dz-.15))])
        panel('body::rear hatch' if rear else 'body::front fascia',rows)
        # Full-width seam lamps have black borders, not saturated emissive slabs.
        pts=[(-.84,1.027,z-sgn*.095),(-.76,1.031,z-sgn*.030),(-.63,1.033,z+sgn*.022),(0,1.036,z+sgn*.041),(.63,1.033,z+sgn*.022),(.76,1.031,z-sgn*.030),(.84,1.027,z-sgn*.095)]
        tube('trim::lamp channel',pts,.012,'black')
        tube('light::seam lamp',[(x,y+.003,zz+sgn*.008) for x,y,zz in pts],.0045,'red' if rear else 'white')
        box('trim::plate surround',(0,.62,z+sgn*.07),(.50,.128,.018),'black',.012)
        box('trim::license plate',(0,.625,z+sgn*.085),(.414,.09,.006),'chrome',.005)
        # Lower grilles and satin skid-plate visually distinguish combustion SX2.
        panel('trim::grille surround',[[(-.62,.40,z+sgn*.035),(-.60,.405,z+sgn*.055),(0,.405,z+sgn*.067),(.60,.405,z+sgn*.055),(.62,.40,z+sgn*.035)],[(-.66,.72,z+sgn*.02),(-.62,.745,z+sgn*.03),(0,.757,z+sgn*.055),(.62,.745,z+sgn*.03),(.66,.72,z+sgn*.02)]],mat='black',subdivisions=1,thickness=.006)
        for j in range(32):
            x=(j-15.5)*.038
            box('trim::grille fin',(x,.55,z+sgn*.068-abs(x)*.03),(.010,.26,.008),'black',.003)
        for y in [.45,.51,.58,.66]:tube('trim::grille horizontal slat',[(-.62,y,z+sgn*.054),(0,y+.005,z+sgn*.073),(.62,y,z+sgn*.054)],.008,'black')
        panel('trim::skid plate',[[(-.67,.30,z),(-.5,.28,z+sgn*.07),(0,.28,z+sgn*.09),(.5,.28,z+sgn*.07),(.67,.30,z)],[(-.64,.37,z+sgn*.044),(-.48,.38,z+sgn*.08),(0,.38,z+sgn*.10),(.48,.38,z+sgn*.08),(.64,.37,z+sgn*.044)]],mat='chrome',subdivisions=1)
        for side in [-1,1]:
            # Tapered, three-level combination lamp in the armor-shaped corner cladding.
            lamp=[(.695,.85),(.835,.815),(.852,.48),(.779,.44),(.71,.60)]
            verts=[]
            for dz in [-.006,.02]:
                for x,y in lamp:verts.append((side*x,y,z+sgn*(dz-.05*(x-.70)/.15)))
            n=len(lamp);mesh('trim::vertical lamp housing',verts,[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],'black',False)
            for j in range(3):
                y=.62+j*.055;cx=.775-j*.015
                box('light::headlamp' if not rear else 'light::rear combination lamp',(side*cx,y,z+sgn*.021),(.090-j*.008,.024,.006),'red' if rear else 'white',.008)
            tube('trim::corner satin garnish',[(side*.665,.43,z+sgn*.031),(side*.655,.58,z+sgn*.041),(side*.689,.73,z+sgn*.015)],.014,'chrome')
    # Rear roof spoiler, shark fin and rear wiper.
    box('roof::rear spoiler',(0,1.502,1.58),(1.35,.068,.32),'paint',.025)
    box('light::high stop lamp',(0,1.495,1.731),(.38,.012,.008),'red',.004)
    fin=mesh('roof::shark fin',[(-.035,1.585,1.17),(.035,1.585,1.17),(0,1.69,1.20),(-.024,1.575,1.34),(.024,1.575,1.34)],[(0,1,2),(0,2,3),(1,4,2),(2,4,3),(0,3,4,1)],'black')
    rod('trim::rear wiper',(0,1.12,2.042),(.31,1.14,2.02),.006,'black')
    # Interior silhouettes visible through glass, improving depth and scale.
    box('interior::dashboard',(0,1.04,-.55),(1.50,.19,.34),'interior',.065)
    box('interior::display',(0,1.19,-.47),(.55,.15,.032),'black',.018)
    for x in [-.38,.38]:
        for z in [-.03,.89]:
            box('interior::seat base',(x,.66,z),(.43,.14,.45),'interior',.065)
            box('interior::seat back',(x,.95,z+.15),(.43,.50,.14),'interior',.06)
            box('interior::head rest',(x,1.26,z+.15),(.25,.18,.12),'interior',.038)
    export('kona-sx2-body')

def build_chassis():
    reset()
    # Unibody floor, stamped beads, sills and raised center tunnel (no ladder frame).
    box('floor::front floor',(0,.365,.03),(1.46,.025,1.56),'steel',.016)
    box('floor::rear floor',(0,.43,1.34),(1.44,.025,1.33),'steel',.02)
    box('floor::firewall',(0,.68,-.73),(1.40,.60,.036),'steel',.02)
    box('floor::center tunnel',(0,.385,.08),(.29,.24,1.74),'steel',.07)
    for x in [-.72,.72]:
        box('floor::sill',(x,.35,.21),(.092,.14,2.90),'steel',.028)
        for z in [-.5,.02,.62,1.3]:box('floor::outrigger',(x*.55,.36,z),(.72,.036,.061),'steel',.009)
    for x in [-.5,-.33,.33,.5]:
        for z in [-.25,.3,1.48]:box('floor::stamping bead',(x,.38,z),(.018,.012,.31),'steel',.006)
    # Radiator support and longitudinal crash rails, representative packaging only.
    for side in [-1,1]:
        box('frame::front side member',(side*.61,.53,-1.43),(.095,.14,1.25),'steel',.028)
        box('frame::rear side member',(side*.57,.42,1.36),(.082,.12,1.30),'steel',.026)
        cyl('frame::strut tower',(side*.62,.86,-1.33),.15,.065,'steel','y')
        bolt('frame::tower bolt',(side*.62,.907,-1.43),.009)
    box('frame::front impact bar',(0,.49,-2.04),(1.41,.11,.096),'steel',.025)
    # Front and rear subframes: formed arms and compliant mounting bushings.
    for z,rear in [(-1.33,False),(1.33,True)]:
        for zz in [z-.22,z+.22]:
            tube('suspension::subframe crossmember',[(-.57,.23,zz),(-.38,.225,zz+.025),(0,.215,zz+.03),(.38,.225,zz+.025),(.57,.23,zz)],.042,'black')
        for x in [-.49,.49]:
            box('suspension::subframe side',(x,.22,z),(.11,.071,.51),'black',.025)
            for dz in [-.24,.24]:cyl('suspension::subframe bushing',(x,.26,z+dz),.039,.055,'rubber','y')
        for side in [-1,1]:
            # Hub upright, lower arm triangle, bushes and balljoint.
            box('suspension::knuckle',(side*.738,.337,z),(.055,.155,.13),'cast',.022)
            for dz in [-.20,.17]:
                rod('suspension::lower arm',(side*.43,.23,z+dz),(side*.742,.255,z),.021,'black')
                cyl('suspension::inner bush',(side*.43,.23,z+dz),.033,.065,'rubber','z')
            rod('suspension::arm bridge',(side*.43,.23,z-.2),(side*.43,.23,z+.17),.028,'black')
            cyl('suspension::ball joint',(side*.745,.263,z),.026,.049,'machined','y')
            # MacPherson front; rear separate spring and damper with multiple links.
            sx=side*(.65 if not rear else .57);sz=z+(.015 if not rear else -.13)
            rod('suspension::damper body',(side*.723,.33,z+.05),(sx,.61,sz),.029,'black')
            rod('suspension::damper rod',(sx,.61,sz),(sx,.83,sz),.013,'chrome')
            if rear:
                for dy,dz in [(.04,-.26),(.13,.13)]:rod('suspension::rear link',(side*.38,.25+dy,z+dz),(side*.737,.33+dy,z+dz*.25),.016,'black')
                rod('suspension::trailing link',(side*.715,.27,z),(side*.69,.29,z-.5),.024,'black')
            cy=.62 if not rear else .46;cx=side*(.657 if not rear else .57);cz=z if not rear else z+.10
            pts=[]
            for j in range(170):
                t=j/169; a=t*5.4*TAU;pts.append((cx+.077*math.cos(a),cy-.13+t*.26,cz+.077*math.sin(a)))
            tube('suspension::coil spring',pts,.008,'steel',resolution=2)
            for y in [cy-.14,cy+.14]:cyl('suspension::spring seat',(cx,y,cz),.094,.012,'black','y')
            # Tie rod (front) and anti-roll bar end link.
            if not rear:rod('suspension::tie rod',(side*.38,.30,z+.16),(side*.724,.35,z+.12),.012,'steel')
            rod('suspension::ARB end link',(side*.56,.29,z+.20),(side*.70,.52,z+.15),.007,'steel')
        tube('suspension::anti roll bar',[(-.69,.29,z+.13),(-.55,.23,z+.25),(0,.23,z+.28),(.55,.23,z+.25),(.69,.29,z+.13)],.012,'black')
    rod('suspension::steering rack',(-.45,.30,-1.12),(.45,.30,-1.12),.035,'cast')
    # Exhaust routed beside prop shaft, tank and muffler behind rear suspension.
    tube('utilities::exhaust',[(-.18,.38,-1.02),(-.20,.22,-.66),(-.22,.20,.15),(-.24,.23,.76),(-.39,.25,1.44),(-.39,.27,1.68)],.023,'steel')
    box('utilities::fuel tank',(.38,.31,.78),(.66,.16,.53),'black',.065)
    box('utilities::rear muffler',(0,.30,1.85),(.87,.16,.28),'steel',.055)
    tube('utilities::tail pipe',[(.35,.29,1.9),(.48,.28,2.12)],.028,'steel')
    # Engine bay context: radiator, fan shroud, battery, intake airbox and hoses.
    box('bay::radiator',(0,.60,-1.96),(1.24,.43,.047),'cast',.018)
    for y in [.44,.48,.52,.56,.6,.64,.68,.72,.76]:box('bay::radiator fin',(0,y,-1.99),(1.16,.005,.012),'black',.002)
    box('bay::battery',(-.62,.81,-.91),(.22,.23,.29),'black',.015)
    for x in [-.69,-.55]:cyl('bay::battery terminal',(x,.94,-.91),.012,.014,'copper','y')
    box('bay::air cleaner',(-.59,.83,-1.67),(.32,.17,.30),'black',.035)
    for z in [-1.77,-1.73,-1.69,-1.65,-1.61]:box('bay::airbox rib',(-.59,.92,z),(.25,.012,.013),'black',.006)
    tube('bay::intake hose',[(-.44,.85,-1.6),(-.32,.82,-1.58),(-.21,.76,-1.70)],.035,'black')
    tube('bay::coolant hose',[(.32,.65,-1.76),(.5,.68,-1.87),(.53,.66,-1.95)],.021,'rubber')
    export('kona-sx2-chassis')

def build_transmission():
    reset()
    # Ribbed cast case around two pulley axes, reference geometry for the IVT family.
    for name,z,r in [('primary',0,.98),('secondary',1.85,1.0)]:
        # Open side of casting is an actual sectional envelope with raised flange.
        profile=[(-.76,.20),(-.76,r*.73),(-.68,r),(.36,r),(.45,r*.86),(.5,.20)]
        o=lathe('case::'+name+' casing',profile,'cast',96)
        # Flange and perimeter fasteners follow sensible casing boundary.
        o.location=V((0,0,z))
        for x in [-.70,.39]:
            o=ring('case::joint flange',x,r+.04,.045,'cast',96,inner=r-.04);o.location=V((0,0,z))
            for j in range(12):
                a=j/12*TAU;bolt('case::flange bolt',(x,(r+.015)*math.cos(a),z+(r+.015)*math.sin(a)),.038,'x')
        for j in range(10):
            a=j/10*TAU
            rod('case::casting rib',(-.68,r*math.cos(a),z+r*math.sin(a)),(.39,r*math.cos(a),z+r*math.sin(a)),.024,'cast')
    box('case::center web',(-.05,-.04,.925),(1.22,1.24,1.20),'cast',.10)
    box('pan::transmission pan',(-.08,-1.01,.92),(1.31,.18,2.52),'black',.06)
    for z in [-.14,.45,1.06,1.66,2.0]:
        for x in [-.61,.48]:bolt('pan::pan bolt',(x,-1.09,z),.025,'y')
    # Bellhousing goes at engine interface, converter remains inspectable in cutaways.
    profile=[(-1.43,.14),(-1.37,.64),(-1.31,.79),(-1.24,.81),(-.85,.9),(-.7,.96),(-.66,.96),(-.64,.86)]
    lathe('bell::bellhousing',profile,'cast',96)
    for j in range(9):
        a=j/9*TAU
        rod('bell::bell web',(-1.33,.72*math.cos(a),.72*math.sin(a)),(-.71,.90*math.cos(a),.90*math.sin(a)),.025,'cast')
    export('ivt-casting')

import sys
selected=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
for name,build in [('wheel',build_wheel),('engine',build_engine),('body',build_body),('chassis',build_chassis),('ivt',build_transmission)]:
    if not selected or name in selected:build()
print('Completed original educational asset generation.')
