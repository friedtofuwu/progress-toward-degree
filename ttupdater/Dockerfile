FROM python
LABEL maintainer="bbradner@vt.edu"

ADD ttupdater.py .
ADD requirements.txt .

RUN pip install -r requirements.txt
CMD [ "python", "ttupdater.py" ]