from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS  # Import CORS
import os
from werkzeug.utils import secure_filename
import trimesh

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all requests


UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided.'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected.'}), 400

    filename = secure_filename(file.filename)
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    return jsonify({'message': 'File uploaded successfully.', 'filename': filename}), 200

@app.route('/uploads/<filename>', methods=['GET'])
def serve_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

EXPORT_FOLDER = 'exports'
if not os.path.exists(EXPORT_FOLDER):
    os.makedirs(EXPORT_FOLDER)
app.config['EXPORT_FOLDER'] = EXPORT_FOLDER

@app.route('/convert', methods=['POST'])
def convert_stl_to_obj():
    data = request.json
    filename = data.get('filename')

    if not filename or not filename.lower().endswith('.stl'):
        return jsonify({'error': 'Invalid STL file'}), 400

    stl_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    obj_filename = filename.replace('.stl', '.obj')
    obj_path = os.path.join(app.config['EXPORT_FOLDER'], obj_filename)

    if not os.path.exists(stl_path):
        return jsonify({'error': 'STL file not found'}), 404

    try:
        mesh = trimesh.load_mesh(stl_path)
        mesh.export(obj_path)

        return jsonify({'message': 'Conversion successful.', 'obj_filename': obj_filename}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/exports/<filename>', methods=['GET'])
def download_exported_file(filename):
    file_path = os.path.join(app.config['EXPORT_FOLDER'], filename)

    if not os.path.exists(file_path):
        return jsonify({'error': 'Exported file not found'}), 404

    return send_from_directory(app.config['EXPORT_FOLDER'], filename)

if __name__ == '__main__':
    app.run(debug=True)
