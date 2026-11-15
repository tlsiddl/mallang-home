import hmac
import os
from datetime import datetime, timedelta, timezone

import google.auth
from google.auth.transport.requests import AuthorizedSession
from flask import Flask, jsonify, request

app = Flask(__name__)
PROJECT = os.environ['GOOGLE_CLOUD_PROJECT']
KEY = os.environ['CREDIT_API_KEY']
ORIGIN = os.environ['ALLOWED_ORIGIN']

@app.after_request
def headers(response):
    if request.headers.get('Origin') == ORIGIN:
        response.headers['Access-Control-Allow-Origin'] = ORIGIN
        response.headers['Vary'] = 'Origin'
        response.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    response.headers['Cache-Control'] = 'no-store'
    return response

@app.route('/usage', methods=['GET', 'OPTIONS'])
def usage():
    if request.method == 'OPTIONS':
        return ('', 204)
    token = request.headers.get('Authorization', '').removeprefix('Bearer ')
    if not KEY or not hmac.compare_digest(token, KEY):
        return jsonify(error='Unauthorized'), 401
    try:
        start = datetime.fromisoformat(request.args['start'].replace('Z', '+00:00'))
        end = datetime.fromisoformat(request.args['end'].replace('Z', '+00:00'))
        if start.tzinfo is None or end.tzinfo is None or end <= start or end - start > timedelta(days=42) or end > datetime.now(timezone.utc) + timedelta(minutes=5):
            raise ValueError()
    except (KeyError, ValueError, OverflowError):
        return jsonify(error='Invalid time interval'), 400
    seconds = max(60, int((end-start).total_seconds()+0.999))
    credentials, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/monitoring.read'])
    session = AuthorizedSession(credentials)
    params = [('filter', 'metric.type="aiplatform.googleapis.com/publisher/online_serving/token_count"'),
              ('interval.startTime', (end-timedelta(seconds=seconds)).isoformat()), ('interval.endTime', end.isoformat()),
              ('aggregation.alignmentPeriod', f'{seconds}s'), ('aggregation.perSeriesAligner', 'ALIGN_SUM'),
              ('aggregation.crossSeriesReducer', 'REDUCE_SUM'), ('aggregation.groupByFields', 'resource.label.model_user_id'),
              ('aggregation.groupByFields', 'metric.label.type')]
    series = []
    for _ in range(10):
        result = session.get(f'https://monitoring.googleapis.com/v3/projects/{PROJECT}/timeSeries', params=params, timeout=20)
        if not result.ok:
            return jsonify(error='Google Monitoring request failed', status=result.status_code), 502
        data = result.json()
        series.extend(data.get('timeSeries', []))
        page = data.get('nextPageToken')
        if not page:
            return jsonify(timeSeries=series)
        params = [(k, v) for k, v in params if k != 'pageToken'] + [('pageToken', page)]
    return jsonify(error='Too many results'), 502

