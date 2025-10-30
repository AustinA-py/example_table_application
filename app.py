from flask import Flask, render_template, request
from api_handlers import get_data_handler, get_record_handler, post_record_handler


app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/data')
def get_data():
    return get_data_handler()


@app.route('/api/record', methods=['GET', 'POST'])
def handle_record():
    if request.method == 'POST':
        return post_record_handler()
    else:
        return get_record_handler()

if __name__ == '__main__':
    app.run(debug=True)