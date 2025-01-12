# FDM Monster Kubernetes Guide

This configuration template is provided for those wanting to deploy FDM Monster
via kubernetes. This guide uses the [kustomize](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/)
convention that employs [bases and overlays](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/#bases-and-overlays)
to keep things generalized.  Customization to a specific deployment is done
through an overlay. Finally, this configuration uses the sqlite convention of
deploying the fdm-monster application.

## Requirements

A kubernetes installation that has `ingress` functionality enabled. This
configuration was tested with [microk8s](https://microk8s.io/), but other
distributions such as [k3s](https://k3s.io/), [minikube](https://minikube.sigs.k8s.io/docs/),
etc. should also work if they have ingress support enabled. See documentation
for your kubernetes environment for enabling ingress.

## Try/Test Base Configuration

The base configuration uses `emptyDir` volumes, so you can try fdm-monster by
simply applying the base configuration.

```bash
kubectl apply -k base
```

You can then navigate to `fdm-monster.local` and go through the setup process
and explore the functionality. Note that there is no persistent storage
configured due to the `emptyDir` configuration so continue to the section below
to deploy and configure persistent storage.

## Deploy

First create an overlay:

```bash
mkdir -p kubernetes/overlays/local
cd kubernetes/overlays/local
```

Next create patch files to alter the volumes, environment variables, or whatever
else you'd like. Below is an example of changing the volumes from `emptyDir` to
an `nfs` source. If using an nfs be sure to replace IP's below with your nfs IP
address and appropriate export path. Be aware there are two volumes one will
need to adjust; `fdm-monster-media` and `fdm-monster-db`.

```bash
cat > deployment-fdm-monster-patch.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: fdm-monster
  name: fdm-monster
spec:
  selector:
    matchLabels:
      app: fdm-monster
  template:
    spec:
      volumes:
        - name: fdm-monster-media
          nfs:
            server: 192.168.1.42
            path: /opt/kube-nfs/fdm-monster/media
            readOnly: false
        - name: fdm-monster-db
          nfs:
            server: 192.168.1.42
            path: /opt/kube-nfs/fdm-monster/db
            readOnly: false
status: {}
EOF
```

**NOTE:** For nfs, make sure the directory structure is created in advance and
appropriate exports are configured.

If you want to use an alternative ingress you can patch it by first creating a
replacement ingress definition:

```bash
cat > ingress-patch.yaml << EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: fdm-monster-ingress
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "0"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
spec:
  rules:
  - host: "fdm-monster.myhomedomain.local"
    http:
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          service:
            name: fdm-monster
            port:
              number: 4000
EOF
```

At this point you can add/remove other patches per the kustomize
[patch documentation](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/#customizing).
One may want to edit the namespace or add additional services, etc. After all
your patches are finished you just need to create a `kustomization.yaml` file in
the overlay that references the base.

```bash
cat > kustomization.yaml << EOF
resources:
  - ../../base
patches:
  - path: deployment-fdm-monster-patch.yaml
  - path: ingress-patch.yaml
    target:
      kind: Ingress
      name: fdm-monster-ingress
EOF
```

After this, test out your configuration:

```bash
# Assumes you're still in the overlay/local directory
kubectl apply -k . 
```

You can then watch the deployment with `watch kubectl get all -n fdm-monster`.
Output should look like the below once everything is up and running:

```bash
Every 2.0s: kubectl get all -n fdm-monster                                                                                                 ubuntu: Sat Dec 14 17:39:53 2024

NAME                               READY   STATUS    RESTARTS   AGE
pod/fdm-monster-66496c586c-rrzs6   1/1     Running   0          5m30s

NAME                  TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)     AGE
service/fdm-monster   ClusterIP   10.152.183.71   <none>        4000/TCP    5m30s

NAME                          READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/fdm-monster   1/1     1            1           5m30s

NAME                                     DESIRED   CURRENT   READY   AGE
replicaset.apps/fdm-monster-66496c586c   1         1         1       5m30s
```

You can then navigate to [fdm-monster.local](http://fdm-monster.local) or your
modified hostname in the patch to setup fdm-monster.
